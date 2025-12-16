(function () {
  'use strict';

  const globalObj = window;
  const existing = globalObj.StorefrontAPI || {};

  const cache = new Map();

  function stableStringify(value) {
    try {
      return JSON.stringify(value || {});
    } catch (e) {
      return '';
    }
  }

  async function graphqlRequest({ endpoint, token, query, variables }) {
    if (!endpoint) throw new Error('StorefrontAPI: missing endpoint');
    if (!query) throw new Error('StorefrontAPI: missing query');

    const headers = {
      'Content-Type': 'application/json',
    };

    // Token is optional (tokenless Storefront queries are supported for many public queries).
    if (token) headers['X-Shopify-Storefront-Access-Token'] = token;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(`StorefrontAPI: HTTP ${res.status} ${res.statusText}: ${stableStringify(json)}`);
    }

    if (json.errors) {
      throw new Error(`StorefrontAPI: GraphQL errors: ${stableStringify(json.errors)}`);
    }

    return json.data;
  }

  const StorefrontAPI = {
    config: Object.assign(
      {
        endpoint: null,
        token: null,
      },
      existing.config || {}
    ),

    setConfig(nextConfig) {
      this.config = Object.assign({}, this.config, nextConfig || {});
    },

    /**
     * Run a Storefront API query.
     *
     * Usage:
     *   StorefrontAPI.query(queryString, { foo: 1 })
     *   StorefrontAPI.query(queryString, { foo: 1 }, { endpoint, token, cacheKey })
     */
    async query(query, variables, options) {
      const opts = options || {};
      const endpoint = opts.endpoint || this.config.endpoint;
      const token = opts.token || this.config.token;

      const key =
        opts.cacheKey ||
        `${endpoint || ''}::${token ? 'token' : 'tokenless'}::${query}::${stableStringify(variables)}`;

      if (opts.cache !== false) {
        const cached = cache.get(key);
        if (cached) return cached;
      }

      const promise = graphqlRequest({ endpoint, token, query, variables });

      if (opts.cache !== false) {
        cache.set(key, promise);
      }

      return promise;
    },

    queries: Object.assign(
      {
        productsWithVariants: `query ProductsWithVariants($productsFirst: Int!, $variantsFirst: Int!) {
  products(first: $productsFirst) {
    nodes {
      id
      title
      handle
      variants(first: $variantsFirst) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
          image {
            url
            altText
          }
        }
      }
    }
  }
}`,
      },
      existing.queries || {}
    ),
  };

  globalObj.StorefrontAPI = StorefrontAPI;
})();
