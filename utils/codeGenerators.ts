
import { DesignSystem, ApiSpecification } from '../types';

/**
 * Generates a valid tailwind.config.js string from the DesignSystem state.
 */
export const generateTailwindConfig = (system?: DesignSystem): string => {
  if (!system) return '';

  const colors: Record<string, string> = {};
  system.colorPalette.forEach(c => {
    // Sanitize name to be a valid key (e.g. "Brand Primary" -> "brand-primary")
    const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    colors[key] = c.hex;
  });

  const fontFamilies: Record<string, string[]> = {};
  system.typography.forEach(t => {
    const key = t.role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Simple parsing assuming the user entered a font stack or single font
    const fonts = t.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
    fontFamilies[key] = fonts;
  });

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 6).replace(/}/g, '      }')},
      fontFamily: ${JSON.stringify(fontFamilies, null, 6).replace(/}/g, '      }')}
    },
  },
  plugins: [],
};`;
};

/**
 * Generates a basic OpenAPI 3.0 (YAML-like) string from ApiSpecification.
 * We are generating JSON here for simplicity, but it's valid OpenAPI.
 */
export const generateOpenApiSpec = (spec?: ApiSpecification, projectName: string = 'Project'): string => {
  if (!spec) return '';

  const paths: Record<string, any> = {};

  spec.endpoints.forEach(ep => {
    if (!paths[ep.path]) paths[ep.path] = {};
    
    const method = ep.method.toLowerCase();
    paths[ep.path][method] = {
      summary: ep.summary,
      responses: {
        '200': {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: JSON.parse(ep.responseSuccess || '{}') // Best effort parse
              }
            }
          }
        }
      }
    };

    if (['post', 'put', 'patch'].includes(method) && ep.requestBody) {
        paths[ep.path][method].requestBody = {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        example: JSON.parse(ep.requestBody || '{}')
                    }
                }
            }
        };
    }
  });

  const openApi = {
    openapi: '3.0.0',
    info: {
      title: projectName,
      version: '1.0.0',
      description: 'Auto-generated via 0relai'
    },
    components: {
      securitySchemes: {
        // Naive inference based on auth string
        mainAuth: {
          type: 'http',
          scheme: spec.authMechanism?.toLowerCase().includes('jwt') || spec.authMechanism?.toLowerCase().includes('bearer') ? 'bearer' : 'basic'
        }
      }
    },
    security: [
      { mainAuth: [] }
    ],
    paths
  };

  return JSON.stringify(openApi, null, 2);
};
