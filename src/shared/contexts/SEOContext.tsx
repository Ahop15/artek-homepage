// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * This file is part of ARTEK Homepage.
 *
 * ARTEK Homepage is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useLocale } from '@shared/hooks';

/**
 * SEO metadata interface
 */
export interface SEOMetadata {
  title: string;
  description: string;
  path?: string;
  /** Current locale for metadata */
  locale?: 'tr' | 'en';
  /** Generic array for unlimited schema types */
  schemas?: any[];
}

/**
 * SEO Context value interface
 */
interface SEOContextValue {
  metadata: SEOMetadata;
  updateMetadata: (metadata: SEOMetadata) => void;
  /** Add a schema to the schemas array */
  addSchema: (schema: any) => void;
  /** Remove a schema by @id */
  removeSchema: (schemaId: string) => void;
  /** Clear all schemas */
  clearSchemas: () => void;
  /** Set schemas array (replaces all existing) */
  setSchemas: (schemas: any[]) => void;
}

/**
 * SEO Context
 * Provides current page metadata to any component in the tree
 */
const SEOContext = createContext<SEOContextValue | undefined>(undefined);

/**
 * SEO Provider Props
 */
interface SEOProviderProps {
  children: React.ReactNode;
}

/**
 * SEO Provider Component
 * Wraps app to provide SEO metadata context.
 * Automatically clears schemas when locale changes to prevent stale data.
 */
export const SEOProvider: React.FC<SEOProviderProps> = ({ children }) => {
  const { locale } = useLocale();

  const [metadata, setMetadata] = useState<SEOMetadata>({
    title: '',
    description: '',
    locale,
    schemas: [],
  });

  // Auto-cleanup: Clear schemas when locale changes
  useEffect(() => {
    setMetadata((prev) => ({
      ...prev,
      locale,
      // Clear old schemas to force re-generation with new locale
      schemas: [],
    }));
  }, [locale]);

  const updateMetadata = useCallback((newMetadata: SEOMetadata) => {
    setMetadata((prev) => ({
      ...prev,
      ...newMetadata,
      // Preserve schemas if not explicitly updated
      schemas: newMetadata.schemas ?? prev.schemas,
    }));
  }, []);

  const addSchema = useCallback((schema: any) => {
    setMetadata((prev) => ({
      ...prev,
      schemas: [...(prev.schemas || []), schema],
    }));
  }, []);

  const removeSchema = useCallback((schemaId: string) => {
    setMetadata((prev) => ({
      ...prev,
      schemas: (prev.schemas || []).filter((s) => s['@id'] !== schemaId),
    }));
  }, []);

  const clearSchemas = useCallback(() => {
    setMetadata((prev) => ({
      ...prev,
      schemas: [],
    }));
  }, []);

  const setSchemas = useCallback((schemas: any[]) => {
    setMetadata((prev) => ({
      ...prev,
      schemas,
    }));
  }, []);

  return (
    <SEOContext.Provider
      value={{
        metadata,
        updateMetadata,
        addSchema,
        removeSchema,
        clearSchemas,
        setSchemas,
      }}
    >
      {children}
    </SEOContext.Provider>
  );
};

/**
 * useSEO Hook
 * Access current page SEO metadata
 *
 * @example
 * const { metadata } = useSEO();
 * console.log(metadata.title, metadata.description);
 */
export const useSEO = (): SEOContextValue => {
  const context = useContext(SEOContext);
  if (!context) {
    throw new Error('useSEO must be used within SEOProvider');
  }
  return context;
};
