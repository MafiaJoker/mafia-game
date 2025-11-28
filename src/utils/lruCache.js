/**
 * LRU (Least Recently Used) Cache implementation
 * Stores values with access time tracking and automatic eviction
 */
export class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize
        this.cache = new Map() // key -> { value, lastAccess }
    }

    /**
     * Get value from cache and update access time
     */
    get(key) {
        const entry = this.cache.get(key)
        if (!entry) {
            return undefined
        }

        // Update last access time
        entry.lastAccess = Date.now()
        return entry.value
    }

    /**
     * Set value in cache with current access time
     * Evicts least recently used entry if cache is full
     */
    set(key, value) {
        // If key exists, update it
        if (this.cache.has(key)) {
            this.cache.set(key, {
                value,
                lastAccess: Date.now()
            })
            return
        }

        // If cache is full, remove least recently used entry
        if (this.cache.size >= this.maxSize) {
            this.evictLRU()
        }

        // Add new entry
        this.cache.set(key, {
            value,
            lastAccess: Date.now()
        })
    }

    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key)
    }

    /**
     * Remove entry from cache
     */
    delete(key) {
        return this.cache.delete(key)
    }

    /**
     * Clear all entries from cache
     */
    clear() {
        this.cache.clear()
    }

    /**
     * Get cache size
     */
    get size() {
        return this.cache.size
    }

    /**
     * Update access time for existing entry
     */
    touch(key) {
        const entry = this.cache.get(key)
        if (entry) {
            entry.lastAccess = Date.now()
        }
    }

    /**
     * Evict least recently used entry
     */
    evictLRU() {
        let lruKey = null
        let lruTime = Infinity

        // Find entry with oldest access time
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < lruTime) {
                lruTime = entry.lastAccess
                lruKey = key
            }
        }

        if (lruKey !== null) {
            console.log(`[LRUCache] Evicting ${lruKey} (last accessed: ${new Date(lruTime).toISOString()})`)
            this.cache.delete(lruKey)
        }
    }

    /**
     * Get all keys in cache
     */
    keys() {
        return Array.from(this.cache.keys())
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const entries = Array.from(this.cache.entries())
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: entries.map(([key]) => key),
            oldestAccess: entries.reduce((min, [, entry]) =>
                Math.min(min, entry.lastAccess), Infinity
            ),
            newestAccess: entries.reduce((max, [, entry]) =>
                Math.max(max, entry.lastAccess), 0
            )
        }
    }
}
