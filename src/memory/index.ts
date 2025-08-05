#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Index } from 'flexsearch';

// Define memory file path using environment variable with fallback
const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'memory.json');

// If MEMORY_FILE_PATH is just a filename, put it in the same directory as the script
const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
  ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
    ? process.env.MEMORY_FILE_PATH
    : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_FILE_PATH)
  : defaultMemoryPath;

// We are storing our memory using entities, relations, and observations in a graph structure
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
class KnowledgeGraphManager {
  private entityIndex: Index;
  private observationIndex: Index;
  
  constructor() {
    // Initialize search indexes
    this.entityIndex = new Index({
      tokenize: "forward",
      cache: true,
      resolution: 9
    });
    
    this.observationIndex = new Index({
      tokenize: "forward", 
      cache: true,
      resolution: 9
    });
  }
  
  private async rebuildIndexes(graph: KnowledgeGraph): Promise<void> {
    // Clear existing indexes
    this.entityIndex = new Index({
      tokenize: "forward",
      cache: true,
      resolution: 9
    });
    
    this.observationIndex = new Index({
      tokenize: "forward",
      cache: true, 
      resolution: 9
    });
    
    // Rebuild entity index
    graph.entities.forEach((entity, index) => {
      const searchText = `${entity.name} ${entity.entityType}`;
      this.entityIndex.add(index, String(searchText));
    });
    
    // Rebuild observation index
    graph.entities.forEach((entity, entityIndex) => {
      entity.observations.forEach((observation, obsIndex) => {
        const id = `${entityIndex}-${obsIndex}`;
        this.observationIndex.add(id, String(observation));
      });
    });
  }
  
  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
      const lines = data.split("\n").filter(line => line.trim() !== "");
      const graph = lines.reduce((graph: KnowledgeGraph, line) => {
        const item = JSON.parse(line);
        if (item.type === "entity") graph.entities.push(item as Entity);
        if (item.type === "relation") graph.relations.push(item as Relation);
        return graph;
      }, { entities: [], relations: [] });
      
      // Rebuild search indexes after loading
      await this.rebuildIndexes(graph);
      return graph;
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
        const emptyGraph = { entities: [], relations: [] };
        await this.rebuildIndexes(emptyGraph);
        return emptyGraph;
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map(e => JSON.stringify({ type: "entity", ...e })),
      ...graph.relations.map(r => JSON.stringify({ type: "relation", ...r })),
    ];
    await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
    
    // Rebuild search indexes after saving
    await this.rebuildIndexes(graph);
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const newEntities = entities.filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name));
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const newRelations = relations.filter(r => !graph.relations.some(existingRelation => 
      existingRelation.from === r.from && 
      existingRelation.to === r.to && 
      existingRelation.relationType === r.relationType
    ));
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(content => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    graph.relations = graph.relations.filter(r => !entityNames.includes(r.from) && !entityNames.includes(r.to));
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach(d => {
      const entity = graph.entities.find(e => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(o => !d.observations.includes(o));
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(r => !relations.some(delRelation => 
      r.from === delRelation.from && 
      r.to === delRelation.to && 
      r.relationType === delRelation.relationType
    ));
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  // Enhanced search function using FlexSearch
  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    if (!query.trim()) {
      return { entities: [], relations: [] };
    }
    
    // Search in entity index (names and types)
    const entityResults = this.entityIndex.search(query, { limit: 100 });
    const matchedEntityIndexes = new Set(entityResults as number[]);
    
    // Search in observation index
    const observationResults = this.observationIndex.search(query, { limit: 100 });
    const matchedObservationEntityIndexes = new Set<number>();
    
    // Parse observation results to get entity indexes
    (observationResults as string[]).forEach(id => {
      const entityIndex = parseInt(id.split('-')[0]);
      if (!isNaN(entityIndex)) {
        matchedObservationEntityIndexes.add(entityIndex);
      }
    });
    
    // Combine all matched entity indexes
    const allMatchedIndexes = new Set([
      ...matchedEntityIndexes,
      ...matchedObservationEntityIndexes
    ]);
    
    // Filter entities based on search results
    const filteredEntities = graph.entities.filter((_, index) => 
      allMatchedIndexes.has(index)
    );
    
    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
    
    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => 
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
    
    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };
    
    return filteredGraph;
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Filter entities
    const filteredEntities = graph.entities.filter(e => names.includes(e.name));
  
    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
  
    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => 
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
  
    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  
    return filteredGraph;
  }

  async batchCreate(data: {
    entities?: Entity[];
    relations?: Relation[];
    observations?: { entityName: string; contents: string[] }[];
  }): Promise<{
    createdEntities: Entity[];
    createdRelations: Relation[];
    addedObservations: { entityName: string; addedObservations: string[] }[];
  }> {
    const graph = await this.loadGraph();
    
    let createdEntities: Entity[] = [];
    let createdRelations: Relation[] = [];
    let addedObservations: { entityName: string; addedObservations: string[] }[] = [];

    // Create entities first
    if (data.entities && data.entities.length > 0) {
      const newEntities = data.entities.filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name));
      graph.entities.push(...newEntities);
      createdEntities = newEntities;
    }

    // Create relations
    if (data.relations && data.relations.length > 0) {
      const newRelations = data.relations.filter(r => !graph.relations.some(existingRelation => 
        existingRelation.from === r.from && 
        existingRelation.to === r.to && 
        existingRelation.relationType === r.relationType
      ));
      graph.relations.push(...newRelations);
      createdRelations = newRelations;
    }

    // Add observations
    if (data.observations && data.observations.length > 0) {
      addedObservations = data.observations.map(o => {
        const entity = graph.entities.find(e => e.name === o.entityName);
        if (!entity) {
          throw new Error(`Entity with name ${o.entityName} not found`);
        }
        const newObservations = o.contents.filter(content => !entity.observations.includes(content));
        entity.observations.push(...newObservations);
        return { entityName: o.entityName, addedObservations: newObservations };
      });
    }

    // Save the graph once at the end
    await this.saveGraph(graph);

    return {
      createdEntities,
      createdRelations,
      addedObservations
    };
  }

  /**
   * Find duplicates across entities, relations, and observations with intelligent matching
   * @param data Object containing entities, relations, and observations to check for duplicates
   * @param options Optional parameters for similarity thresholds and matching rules
   * @returns Object containing potential duplicate entities, relations, and observations with similarity scores
   */
  async findDuplicates(data: {
    entities?: Entity[];
    relations?: Relation[];
    observations?: { entityName: string; contents: string[] }[];
    // New: Option to check for duplicates within the existing graph
    checkExistingGraph?: boolean;
  }, options: {
    // Similarity threshold (0-1) for entity name matching
    entityNameSimilarityThreshold?: number;
    // Whether to consider entity type when checking duplicates
    considerEntityType?: boolean;
    // Similarity threshold (0-1) for observation content matching
    observationSimilarityThreshold?: number;
    // Whether to check for duplicates within the existing graph (not just against input data)
    checkExistingGraph?: boolean;
    // Whether to enable semantic matching
    semanticMatchingEnabled?: boolean;
    // Preset modes: 'strict', 'standard', 'loose'
    preset?: 'strict' | 'standard' | 'loose';
  } = {}): Promise<{
    duplicateEntities: { entity: Entity; existingEntity: Entity; similarityScore: number; matchType: string; details: string; duplicateType: string }[];
    duplicateRelations: { relation: Relation; existingRelation: Relation; similarityScore: number; matchType: string; details: string; duplicateType: string }[];
    duplicateObservations: { entityName: string; observation: string; existingObservation: string; similarityScore: number; matchType: string; details: string; duplicateType: string }[];
    // New: Existing graph duplicates
    existingDuplicates: {
      entities: { entity1: Entity; entity2: Entity; similarityScore: number; matchType: string; details: string }[];
      relations: { relation1: Relation; relation2: Relation; similarityScore: number; matchType: string; details: string }[];
    };
    // Statistics summary
    statistics: {
      totalDuplicates: number;
      entityDuplicates: number;
      relationDuplicates: number;
      observationDuplicates: number;
      existingEntityDuplicates: number;
      existingRelationDuplicates: number;
    };
  }> {
    const graph = await this.loadGraph();
    
    // Set default options
    const defaultOptions = {
      entityNameSimilarityThreshold: 0.8,
      considerEntityType: true,
      observationSimilarityThreshold: 0.7,
      checkExistingGraph: false,
      semanticMatchingEnabled: false,
      preset: 'standard' as 'strict' | 'standard' | 'loose'
    };
    
    // Apply preset configurations
    const presetConfigs = {
      strict: { entityNameSimilarityThreshold: 0.95, observationSimilarityThreshold: 0.9, semanticMatchingEnabled: false },
      standard: { entityNameSimilarityThreshold: 0.8, observationSimilarityThreshold: 0.7, semanticMatchingEnabled: false },
      loose: { entityNameSimilarityThreshold: 0.6, observationSimilarityThreshold: 0.5, semanticMatchingEnabled: true }
    };
    
    // Merge options with presets
    const presetConfig = presetConfigs[options.preset || defaultOptions.preset];
    const mergedOptions = { ...defaultOptions, ...presetConfig, ...options };

    let duplicateEntities: { entity: Entity; existingEntity: Entity; similarityScore: number; matchType: string; details: string; duplicateType: string }[] = [];
    let duplicateRelations: { relation: Relation; existingRelation: Relation; similarityScore: number; matchType: string; details: string; duplicateType: string }[] = [];
    let duplicateObservations: { entityName: string; observation: string; existingObservation: string; similarityScore: number; matchType: string; details: string; duplicateType: string }[] = [];
    let existingDuplicates = {
      entities: [] as { entity1: Entity; entity2: Entity; similarityScore: number; matchType: string; details: string; duplicateType: string }[],
      relations: [] as { relation1: Relation; relation2: Relation; similarityScore: number; matchType: string; details: string; duplicateType: string }[]
    };

    // Helper function to calculate string similarity (Levenshtein distance)
    const calculateSimilarity = (str1: string, str2: string): number => {
      if (str1 === str2) return 1.0;
      const len1 = str1.length;
      const len2 = str2.length;
      const maxLen = Math.max(len1, len2);
      if (maxLen === 0) return 1.0;

      // Create distance matrix
      const matrix: number[][] = Array(len1 + 1).fill(0).map(() => Array(len2 + 1).fill(0));

      // Initialize first row and column
      for (let i = 0; i <= len1; i++) matrix[i][0] = i;
      for (let j = 0; j <= len2; j++) matrix[0][j] = j;

      // Fill matrix
      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          const cost = str1[i-1].toLowerCase() === str2[j-1].toLowerCase() ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i-1][j] + 1,
            matrix[i][j-1] + 1,
            matrix[i-1][j-1] + cost
          );
        }
      }

      // Return similarity score (1 - normalized distance)
      return 1 - matrix[len1][len2] / maxLen;
    };

    // Helper function to extract keywords from text
    const extractKeywords = (text: string): string[] => {
      // Simple keyword extraction by splitting on spaces and removing common words
      const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);
      return text.toLowerCase().split(/\s+/).filter(word => word.length > 2 && !commonWords.has(word));
    };

    // Helper function to calculate TF-IDF similarity
    const calculateTFIDFSimilarity = (str1: string, str2: string): number => {
      const keywords1 = extractKeywords(str1);
      const keywords2 = extractKeywords(str2);
      
      if (keywords1.length === 0 && keywords2.length === 0) return 1.0;
      if (keywords1.length === 0 || keywords2.length === 0) return 0.0;
      
      // Calculate term frequency
      const tf1: Record<string, number> = {};
      const tf2: Record<string, number> = {};
      
      keywords1.forEach(word => tf1[word] = (tf1[word] || 0) + 1);
      keywords2.forEach(word => tf2[word] = (tf2[word] || 0) + 1);
      
      // Normalize term frequency
      const norm1 = Math.sqrt(Object.values(tf1).reduce((sum, freq) => sum + freq * freq, 0));
      const norm2 = Math.sqrt(Object.values(tf2).reduce((sum, freq) => sum + freq * freq, 0));
      
      // Calculate cosine similarity
      let dotProduct = 0;
      const allWords = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
      
      allWords.forEach(word => {
        const tf1Norm = tf1[word] ? tf1[word] / norm1 : 0;
        const tf2Norm = tf2[word] ? tf2[word] / norm2 : 0;
        dotProduct += tf1Norm * tf2Norm;
      });
      
      return dotProduct;
    };

    // Helper function for semantic similarity
    const calculateSemanticSimilarity = (str1: string, str2: string): number => {
      // Combine string similarity with TF-IDF similarity
      const stringSim = calculateSimilarity(str1, str2);
      const tfidfSim = calculateTFIDFSimilarity(str1, str2);
      
      // Weighted combination (70% string similarity, 30% TF-IDF similarity)
      return (stringSim * 0.7) + (tfidfSim * 0.3);
    };

    // Helper function to normalize entity names
    const normalizeEntityName = (name: string): string => {
      // Remove common prefixes/suffixes and normalize case
      return name
        .replace(/^(get|set|is|has|can|should|will|did|does|do)_/i, '') // Remove common prefixes
        .replace(/_(getter|setter|handler|manager|service|util|utils)$/i, '') // Remove common suffixes
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
        .toLowerCase();
    };

    // Simple synonym mapping
    const synonymMap: Record<string, string> = {
      'create': 'make',
      'make': 'create',
      'delete': 'remove',
      'remove': 'delete',
      'find': 'search',
      'search': 'find',
      'update': 'modify',
      'modify': 'update',
      'get': 'fetch',
      'fetch': 'get'
    };

    // Helper function to apply synonyms
    const applySynonyms = (text: string): string => {
      const words = text.toLowerCase().split(/\s+/);
      return words.map(word => synonymMap[word] || word).join(' ');
    };

    // Check for duplicate entities in input vs graph
    if (data.entities && data.entities.length > 0) {
      data.entities.forEach(entity => {
        graph.entities.forEach(existingEntity => {
          // Calculate similarity based on options
          let nameSimilarity, typeMatch, similarityScore, matchType, details;
          
          if (mergedOptions.semanticMatchingEnabled) {
            // Use semantic similarity
            const normalizedName1 = normalizeEntityName(entity.name);
            const normalizedName2 = normalizeEntityName(existingEntity.name);
            const synonymName1 = applySynonyms(normalizedName1);
            const synonymName2 = applySynonyms(normalizedName2);
            
            nameSimilarity = calculateSemanticSimilarity(synonymName1, synonymName2);
            typeMatch = mergedOptions.considerEntityType ? 
              calculateSemanticSimilarity(entity.entityType, existingEntity.entityType) : 1.0;
            
            // Determine match type
            if (entity.name === existingEntity.name) {
              matchType = 'exact';
              details = '完全匹配';
            } else if (nameSimilarity > 0.9) {
              matchType = 'semantic';
              details = `语义匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            }
          } else {
            // Use standard string similarity
            nameSimilarity = calculateSimilarity(entity.name, existingEntity.name);
            typeMatch = mergedOptions.considerEntityType ? 
              calculateSimilarity(entity.entityType, existingEntity.entityType) : 1.0;
            
            // Determine match type
            if (entity.name === existingEntity.name) {
              matchType = 'exact';
              details = '完全匹配';
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            }
          }

          // Combined similarity score
          similarityScore = (nameSimilarity * 0.7) + (typeMatch * 0.3);

          // Determine duplicate type
          let duplicateType = 'semantic';
          if (entity.name === existingEntity.name && entity.entityType === existingEntity.entityType) {
            duplicateType = 'structural';
          }

          if (similarityScore >= mergedOptions.entityNameSimilarityThreshold) {
            duplicateEntities.push({
              entity,
              existingEntity,
              similarityScore,
              matchType,
              details,
              duplicateType
            });
          }
        });
      });
    }

    // Check for duplicate relations in input vs graph
    if (data.relations && data.relations.length > 0) {
      data.relations.forEach(relation => {
        graph.relations.forEach(existingRelation => {
          let fromSimilarity, toSimilarity, typeSimilarity, similarityScore, matchType, details;
          
          if (mergedOptions.semanticMatchingEnabled) {
            // Use semantic similarity for relations
            const normalizedFrom1 = normalizeEntityName(relation.from);
            const normalizedFrom2 = normalizeEntityName(existingRelation.from);
            const normalizedTo1 = normalizeEntityName(relation.to);
            const normalizedTo2 = normalizeEntityName(existingRelation.to);
            
            fromSimilarity = calculateSemanticSimilarity(normalizedFrom1, normalizedFrom2);
            toSimilarity = calculateSemanticSimilarity(normalizedTo1, normalizedTo2);
            typeSimilarity = calculateSemanticSimilarity(relation.relationType, existingRelation.relationType);
            
            // Determine match type
            if (relation.from === existingRelation.from && 
                relation.to === existingRelation.to && 
                relation.relationType === existingRelation.relationType) {
              matchType = 'exact';
              details = '完全匹配';
            } else if ((fromSimilarity > 0.9) && (toSimilarity > 0.9) && (typeSimilarity > 0.9)) {
              matchType = 'semantic';
              details = `语义匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            }
          } else {
            // Use standard string similarity
            fromSimilarity = calculateSimilarity(relation.from, existingRelation.from);
            toSimilarity = calculateSimilarity(relation.to, existingRelation.to);
            typeSimilarity = calculateSimilarity(relation.relationType, existingRelation.relationType);
            
            // Determine match type
            if (relation.from === existingRelation.from && 
                relation.to === existingRelation.to && 
                relation.relationType === existingRelation.relationType) {
              matchType = 'exact';
              details = '完全匹配';
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            }
          }

          // Combined similarity score
          similarityScore = (fromSimilarity * 0.35) + (toSimilarity * 0.35) + (typeSimilarity * 0.3);

          // Determine duplicate type
          let duplicateType = 'semantic';
          if (relation.from === existingRelation.from && 
              relation.to === existingRelation.to && 
              relation.relationType === existingRelation.relationType) {
            duplicateType = 'structural';
          }

          if (similarityScore >= mergedOptions.entityNameSimilarityThreshold) {
            duplicateRelations.push({
              relation,
              existingRelation,
              similarityScore,
              matchType,
              details,
              duplicateType
            });
          }
        });
      });
    }

    // Check for duplicate observations in input vs graph
    if (data.observations && data.observations.length > 0) {
      data.observations.forEach(o => {
        const entity = graph.entities.find(e => e.name === o.entityName);
        if (!entity) return;

        o.contents.forEach(content => {
          entity.observations.forEach(existingObservation => {
            let similarityScore, matchType, details;
            
            if (mergedOptions.semanticMatchingEnabled) {
              // Use semantic similarity for observations
              const normalizedContent1 = normalizeEntityName(content);
              const normalizedContent2 = normalizeEntityName(existingObservation);
              const synonymContent1 = applySynonyms(normalizedContent1);
              const synonymContent2 = applySynonyms(normalizedContent2);
              
              similarityScore = calculateSemanticSimilarity(synonymContent1, synonymContent2);
              
              // Determine match type
              if (content === existingObservation) {
                matchType = 'exact';
                details = '完全匹配';
              } else if (similarityScore > 0.9) {
                matchType = 'semantic';
                details = `语义匹配 (相似度: ${(similarityScore * 100).toFixed(1)}%)`;
              } else {
                matchType = 'fuzzy';
                details = `模糊匹配 (相似度: ${(similarityScore * 100).toFixed(1)}%)`;
              }
            } else {
              // Use standard string similarity
              similarityScore = calculateSimilarity(content, existingObservation);
              
              // Determine match type
              if (content === existingObservation) {
                matchType = 'exact';
                details = '完全匹配';
              } else {
                matchType = 'fuzzy';
                details = `模糊匹配 (相似度: ${(similarityScore * 100).toFixed(1)}%)`;
              }
            }
            
            if (similarityScore >= mergedOptions.observationSimilarityThreshold) {
              // Determine duplicate type for observations
              let duplicateType = 'semantic';
              if (content === existingObservation) {
                duplicateType = 'structural';
              }

              duplicateObservations.push({
                entityName: o.entityName,
                observation: content,
                existingObservation,
                similarityScore,
                matchType,
                details,
                duplicateType
              });
            }
          });
        });
      });
    }

    // Check for duplicates within the existing graph if enabled
    if (mergedOptions.checkExistingGraph || data.checkExistingGraph) {
      // Check for entity duplicates within graph
      for (let i = 0; i < graph.entities.length; i++) {
        for (let j = i + 1; j < graph.entities.length; j++) {
          const entity1 = graph.entities[i];
          const entity2 = graph.entities[j];

          let nameSimilarity, typeMatch, similarityScore, matchType, details;
          
          if (mergedOptions.semanticMatchingEnabled) {
            // Use semantic similarity
            const normalizedName1 = normalizeEntityName(entity1.name);
            const normalizedName2 = normalizeEntityName(entity2.name);
            const synonymName1 = applySynonyms(normalizedName1);
            const synonymName2 = applySynonyms(normalizedName2);
            
            nameSimilarity = calculateSemanticSimilarity(synonymName1, synonymName2);
            typeMatch = mergedOptions.considerEntityType ? 
              calculateSemanticSimilarity(entity1.entityType, entity2.entityType) : 1.0;
            
            // Determine match type
            if (entity1.name === entity2.name) {
              matchType = 'exact';
              details = '完全匹配';
            } else if (nameSimilarity > 0.9) {
              matchType = 'semantic';
              details = `语义匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            }
          } else {
            // Use standard string similarity
            nameSimilarity = calculateSimilarity(entity1.name, entity2.name);
            typeMatch = mergedOptions.considerEntityType ? 
              calculateSimilarity(entity1.entityType, entity2.entityType) : 1.0;
            
            // Determine match type
            if (entity1.name === entity2.name) {
              matchType = 'exact';
              details = '完全匹配';
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (相似度: ${(nameSimilarity * 100).toFixed(1)}%)`;
            }
          }

          // Combined similarity score
          similarityScore = (nameSimilarity * 0.7) + (typeMatch * 0.3);

          // Determine duplicate type
          let duplicateType = 'semantic';
          if (entity1.name === entity2.name && entity1.entityType === entity2.entityType) {
            duplicateType = 'structural';
          }

          if (similarityScore >= mergedOptions.entityNameSimilarityThreshold) {
            existingDuplicates.entities.push({
              entity1,
              entity2,
              similarityScore,
              matchType,
              details,
              duplicateType
            });
          }
        }
      }

      // Check for relation duplicates within graph
      for (let i = 0; i < graph.relations.length; i++) {
        for (let j = i + 1; j < graph.relations.length; j++) {
          const relation1 = graph.relations[i];
          const relation2 = graph.relations[j];

          let fromSimilarity, toSimilarity, typeSimilarity, similarityScore, matchType, details;
          
          if (mergedOptions.semanticMatchingEnabled) {
            // Use semantic similarity for relations
            const normalizedFrom1 = normalizeEntityName(relation1.from);
            const normalizedFrom2 = normalizeEntityName(relation2.from);
            const normalizedTo1 = normalizeEntityName(relation1.to);
            const normalizedTo2 = normalizeEntityName(relation2.to);
            
            fromSimilarity = calculateSemanticSimilarity(normalizedFrom1, normalizedFrom2);
            toSimilarity = calculateSemanticSimilarity(normalizedTo1, normalizedTo2);
            typeSimilarity = calculateSemanticSimilarity(relation1.relationType, relation2.relationType);
            
            // Determine match type
            if (relation1.from === relation2.from && 
                relation1.to === relation2.to && 
                relation1.relationType === relation2.relationType) {
              matchType = 'exact';
              details = '完全匹配';
            } else if ((fromSimilarity > 0.9) && (toSimilarity > 0.9) && (typeSimilarity > 0.9)) {
              matchType = 'semantic';
              details = `语义匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            }
          } else {
            // Use standard string similarity
            fromSimilarity = calculateSimilarity(relation1.from, relation2.from);
            toSimilarity = calculateSimilarity(relation1.to, relation2.to);
            typeSimilarity = calculateSimilarity(relation1.relationType, relation2.relationType);
            
            // Determine match type
            if (relation1.from === relation2.from && 
                relation1.to === relation2.to && 
                relation1.relationType === relation2.relationType) {
              matchType = 'exact';
              details = '完全匹配';
            } else {
              matchType = 'fuzzy';
              details = `模糊匹配 (FROM相似度: ${(fromSimilarity * 100).toFixed(1)}%, TO相似度: ${(toSimilarity * 100).toFixed(1)}%, TYPE相似度: ${(typeSimilarity * 100).toFixed(1)}%)`;
            }
          }

          // Combined similarity score
          similarityScore = (fromSimilarity * 0.35) + (toSimilarity * 0.35) + (typeSimilarity * 0.3);

          // Determine duplicate type
          let duplicateType = 'semantic';
          if (relation1.from === relation2.from && 
              relation1.to === relation2.to && 
              relation1.relationType === relation2.relationType) {
            duplicateType = 'structural';
          }

          if (similarityScore >= mergedOptions.entityNameSimilarityThreshold) {
            existingDuplicates.relations.push({
              relation1,
              relation2,
              similarityScore,
              matchType,
              details,
              duplicateType
            });
          }
        }
      }
    }

    // Prepare statistics summary
    const statistics = {
      totalDuplicates: duplicateEntities.length + duplicateRelations.length + duplicateObservations.length + existingDuplicates.entities.length + existingDuplicates.relations.length,
      entityDuplicates: duplicateEntities.length,
      relationDuplicates: duplicateRelations.length,
      observationDuplicates: duplicateObservations.length,
      existingEntityDuplicates: existingDuplicates.entities.length,
      existingRelationDuplicates: existingDuplicates.relations.length
    };

    return {
      duplicateEntities,
      duplicateRelations,
      duplicateObservations,
      existingDuplicates,
      statistics
    };
  }
}

const knowledgeGraphManager = new KnowledgeGraphManager();


// The server instance and tools exposed to Claude
const server = new Server({
  name: "memory-server",
  version: "0.6.3",
},    {
    capabilities: {
      tools: {},
    },
  },);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_entities",
        description: "Create multiple new entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
              },
            },
          },
          required: ["entities"],
        },
      },
      {
        name: "create_relations",
        description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "add_observations",
        description: "Add new observations to existing entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity to add the observations to" },
                  contents: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  },
                },
                required: ["entityName", "contents"],
              },
            },
          },
          required: ["observations"],
        },
      },
      {
        name: "delete_entities",
        description: "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: { 
              type: "array", 
              items: { type: "string" },
              description: "An array of entity names to delete" 
            },
          },
          required: ["entityNames"],
        },
      },
      {
        name: "delete_observations",
        description: "Delete specific observations from entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            deletions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity containing the observations" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observations to delete"
                  },
                },
                required: ["entityName", "observations"],
              },
            },
          },
          required: ["deletions"],
        },
      },
      {
        name: "delete_relations",
        description: "Delete multiple relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            relations: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
              description: "An array of relations to delete" 
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query to match against entity names, types, and observation content" },
          },
          required: ["query"],
        },
      },
      {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to retrieve"
            },
          },
          required: ["names"],
        },
      },
      {
        name: "find_duplicates",
        description: "Find duplicates across entities, relations, and observations in the knowledge graph with intelligent matching, including semantic similarity detection and detailed reporting",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
              },
              description: "Optional array of entities to check for duplicates"
            },
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
              description: "Optional array of relations to check for duplicates"
            },
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity to check observations for" },
                  contents: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observation contents to check for duplicates"
                  },
                },
                required: ["entityName", "contents"],
              },
              description: "Optional array of observations to check for duplicates"
            },
            checkExistingGraph: {
              type: "boolean",
              description: "Whether to check for duplicates within the existing graph (not just against input data)"
            },
            options: {
              type: "object",
              properties: {
                entityNameSimilarityThreshold: {
                  type: "number",
                  description: "Similarity threshold (0-1) for entity name matching",
                  minimum: 0,
                  maximum: 1
                },
                considerEntityType: {
                  type: "boolean",
                  description: "Whether to consider entity type when checking duplicates"
                },
                observationSimilarityThreshold: {
                  type: "number",
                  description: "Similarity threshold (0-1) for observation content matching",
                  minimum: 0,
                  maximum: 1
                },
                semanticMatchingEnabled: {
                  type: "boolean",
                  description: "Whether to enable semantic matching for improved duplicate detection"
                },
                preset: {
                  type: "string",
                  description: "Preset modes: 'strict', 'standard', 'loose'",
                  enum: ["strict", "standard", "loose"]
                }
              }
            }
          }
        }
      },
      {
        name: "batch_create",
        description: "Batch create entities, relations, and observations in a single operation. Supports any combination of the three types.",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
              },
              description: "Optional array of entities to create"
            },
            relations: {
              type: "array", 
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
              },
              description: "Optional array of relations to create"
            },
            observations: {
              type: "array",
              items: {
                type: "object", 
                properties: {
                  entityName: { type: "string", description: "The name of the entity to add the observations to" },
                  contents: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  },
                },
                required: ["entityName", "contents"],
              },
              description: "Optional array of observations to add to existing entities"
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "read_graph") {
    return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.readGraph(), null, 2) }] };
  }

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  switch (name) {
    case "create_entities":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.createEntities(args.entities as Entity[]), null, 2) }] };
    case "create_relations":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.createRelations(args.relations as Relation[]), null, 2) }] };
    case "add_observations":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.addObservations(args.observations as { entityName: string; contents: string[] }[]), null, 2) }] };
    case "delete_entities":
      await knowledgeGraphManager.deleteEntities(args.entityNames as string[]);
      return { content: [{ type: "text", text: "Entities deleted successfully" }] };
    case "delete_observations":
      await knowledgeGraphManager.deleteObservations(args.deletions as { entityName: string; observations: string[] }[]);
      return { content: [{ type: "text", text: "Observations deleted successfully" }] };
    case "delete_relations":
      await knowledgeGraphManager.deleteRelations(args.relations as Relation[]);
      return { content: [{ type: "text", text: "Relations deleted successfully" }] };
    case "search_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.searchNodes(args.query as string), null, 2) }] };
    case "open_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.openNodes(args.names as string[]), null, 2) }] };
    case "batch_create":
      const batchData = {
        entities: args.entities as Entity[] | undefined,
        relations: args.relations as Relation[] | undefined,
        observations: args.observations as { entityName: string; contents: string[] }[] | undefined
      };
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.batchCreate(batchData), null, 2) }] };
    case "find_duplicates":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.findDuplicates(
        {
          entities: args.entities as Entity[] | undefined,
          relations: args.relations as Relation[] | undefined,
          observations: args.observations as { entityName: string; contents: string[] }[] | undefined,
          checkExistingGraph: args.checkExistingGraph as boolean | undefined
        },
        args.options as { 
          entityNameSimilarityThreshold?: number; 
          considerEntityType?: boolean; 
          observationSimilarityThreshold?: number;
          semanticMatchingEnabled?: boolean;
          preset?: 'strict' | 'standard' | 'loose';
        } | undefined
      ), null, 2) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Knowledge Graph MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
