# AGENT.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Personal website ([moritz.berlin](https://moritz.berlin)) - currently transitioning from Eleventy to a custom-built static site generator. This migration is part of adopting a no-dependency philosophy focused on learning internals and building from scratch using native Node.js APIs.

## Migration Status

**Current State:** Using Eleventy (11ty) with multiple dependencies
**Target State:** Custom SSG with zero third-party dependencies (except @types/node)
**Philosophy:** Everything built from scratch for learning and understanding

### Migration Phases

1. **Phase 1 - Core SSG Integration** (Foundation)
   - Copy SSG core code (core/ directory) from the learning project
   - Adapt configuration for website needs (_site vs .build, etc.)
   - Ensure basic build pipeline works
   - Test with simple pages first

2. **Phase 2 - Template Feature Parity** (Critical Path)
   - Implement missing Liquid features (if/else, loops, filters)
   - Build collections system for blog posts
   - Implement custom filters (dateToRFC3339, encodeXML, etc.)
   - Implement shortcodes system (currentYear, etc.)
   - Test with all pages and posts

3. **Phase 3 - Build Tool Replacements** (Quality)
   - Build HTML minification (production mode)
   - Build CSS processing (imports, autoprefixer-lite, minification)
   - Build syntax highlighting for code blocks
   - Asset bundling/optimization

4. **Phase 4 - Developer Experience** (Polish)
   - Dev server with live reload/watch mode
   - Better error messages and debugging
   - Performance optimizations
   - Build time reporting

5. **Phase 5 - Cleanup** (Final)
   - Remove all Eleventy dependencies
   - Remove PostCSS toolchain
   - Update documentation
   - Archive old eleventy.config.js for reference

### Compatibility Preservation

During migration, these must work identically:
- All Liquid template syntax in pages/posts/includes
- Frontmatter structure
- Data file loading (_data/ directory)
- Layout system
- URL structure (permalinks)
- RSS feed generation
- Asset copying (images, fonts, icons)

## Commands

### Current (Eleventy-based)
```bash
npm run build          # Production build
npm start              # Dev server with watch
npm run lint           # Lint JS and CSS
```

### Target (Custom SSG)
```bash
npm run build          # Build site once (outputs to _site/)
npm start              # Build and start dev server with watch mode
npm test               # Run all tests
node --experimental-transform-types --test test/path/to/file.test.ts  # Run single test
```

## Architecture

### Directory Structure
```
src/                      # Source files
  _data/                 # JSON/JS data files (instagram.json, projects.json, etc.)
  _includes/             # Reusable components (skipped in output)
  _layouts/              # Page layouts (skipped in output)
  _posts/                # Blog posts (skipped in output)
  pages/                 # Public pages (home, resume, is, writes, etc.)
  assets/                # Static resources (fonts, images, icons, projects, certifications)
  css/                   # Stylesheets (globals/, layout/, components/)
  scripts/               # JavaScript files
_site/                   # Build output (git-ignored)
core/                    # Build system core
  index.ts              # Main build orchestration
  data.ts               # Data file loading
  server.ts             # Dev server
  config.ts             # Directory & extension configuration
  parser/               # File parsing modules
    parser.ts           # Main parsing pipeline
    frontmatter.ts      # YAML frontmatter parser
    liquid.ts           # Liquid template syntax processing
  utils/                # Utility functions
test/                    # Tests mirror core/ structure
```

### Current Eleventy Features to Replicate

**From eleventy.config.js:**
1. **HTML Minification** (production only)
   - Remove comments
   - Collapse whitespace
   - Only for .html files

2. **CSS Processing**
   - PostCSS imports (combine @import statements)
   - Autoprefixer (add vendor prefixes)
   - CSS minification (cssnano)

3. **Plugins**
   - Syntax highlighting with language detection
   - Bundle plugin for asset management

4. **Filters**
   - `dateToRFC3339`: Convert dates to RFC3339 format
   - `encodeXML`: Escape XML special characters

5. **Shortcodes**
   - `currentYear`: Returns current year

6. **Collections**
   - `posts`: Sorted blog posts from _posts/*.md (newest first)

7. **File Handling**
   - Passthrough copy: assets/, _redirects, scripts/
   - Watch targets: css/**/*.css, scripts/**/*.js
   - Template formats: .liquid, .md, .css

### Template System (Current Behavior)

**Variable Resolution**
- Syntax: `{{identifier.path.to.value}}`
- Sources: _data/ files, page frontmatter
- Example: `{{site.title}}` → loads `_data/site.js` → accesses `title`

**Layout System**
- Defined in frontmatter: `layout: default`
- Layouts in `_layouts/`
- Supports nesting
- Content injection via `{{ content }}`

**Liquid Features in Use**
- `{% render "filename" %}`: Includes from `_includes/`
- `{% render "filename", var: value %}`: Includes with variables
- Filters: `{{ date | dateToRFC3339 }}`
- If/else conditions (to be documented)
- Loops (to be documented)

### Import Aliases
```json
"imports": {
  "#config": "./core/config.ts",
  "#parser/*": "./core/parser/*",
  "#utils/*": "./core/utils/*",
  "#core/*": "./core/*"
}
```

## Code Standards

### Critical Rules
- **No third-party dependencies**: Build everything from scratch (learning goal)
- **ES modules only**: Use native `import`/`export`
- **No semicolons**: Project convention
- **Tabs for indentation**: Already configured in biome.json
- **Single quotes for strings**: Already configured in biome.json
- **Latest Node.js APIs**: Use modern native features

### TypeScript
- Strong typing: Avoid `any`, prefer `unknown`
- Use `import type` for type-only imports
- Custom types/interfaces for complex structures
- Naming: PascalCase (classes), camelCase (variables/functions), kebab-case (files)

### Functions
- Descriptive names with verbs and nouns
- Prefer arrow functions for simple operations
- Use default parameters and object destructuring

### Testing
- Use `node:test` framework
- Test files mirror source: `test/parser.test.ts` tests `core/parser/parser.ts`
- Use `describe()` and `it()` for organization
- Import assertions from `node:assert`

## Working Approach

### For SSG Migration Tasks
- **Phase-aware**: Understand which migration phase we're in
- **Test as you go**: Verify each feature works before moving to next
- **Preserve behavior**: Website must work identically after migration
- **Document decisions**: Track what was built and why

### For Content/Design Changes
- **Iterative**: Make changes incrementally
- **Visual testing**: Check rendered output in browser
- **Performance-conscious**: Monitor build times and file sizes

### For New Features
- **Native first**: Check if Node.js has built-in solution
- **Simple over complex**: Minimal viable implementation
- **Learning-focused**: Understand the problem before solving

## Migration Guidelines

### Before Removing Dependencies
1. Ensure replacement feature has full parity
2. Test with production build
3. Verify visual output matches
4. Check browser compatibility
5. Document what was replaced and how

### CSS Processing Transition
When replacing PostCSS:
- Start with @import resolution (most critical)
- Add autoprefixer-lite (target modern browsers only)
- Add minification (whitespace removal, basic optimizations)
- Keep source maps for debugging during transition

### HTML Minification Transition
When replacing html-minifier:
- Preserve Liquid syntax during processing
- Only minify final output HTML
- Keep production-only flag
- Test with all page templates

### Syntax Highlighting Transition
When replacing eleventy-plugin-syntaxhighlight:
- Support existing language tags
- Preserve code block structure
- Generate similar HTML output (for CSS compatibility)
- Support `data-language` attribute

## Versioning

Custom format: `Year.Month.Commits.Type`
- Types: `M1` (Major), `M2` (Minor), `P0` (Patch)
- Example: `25.03.24.P0`
- Update in package.json

## Communication Style

- No apologies or understanding feedback
- No summaries of changes made
- Provide file links with line numbers (format: `file:line`)
- Make changes file-by-file
- Don't remove unrelated code

## Special Considerations

### Data Files
- `site.js` uses default export (not JSON)
- Some JSON files are large (instagram.json ~25KB)
- Must support both .json and .js formats

### Pages
- Currently .liquid extension
- Nested in subdirectories (pages/home/, pages/resume/)
- Each has index.liquid
- Permalinks control output structure

### Build Output
- Uses `_site/` not `.build/`
- Must match exact structure for deployment
- statichost.yml for hosting configuration

### Content
- Blog posts date back to 2015
- All use markdown with frontmatter
- URLs must remain stable (SEO)
- RSS feed must validate

## Current Dependencies (to phase out)

### Must Remove
- @11ty/eleventy (entire framework)
- @11ty/eleventy-plugin-* (all plugins)
- postcss, postcss-cli, postcss-import
- autoprefixer, cssnano
- html-minifier
- cross-env, rimraf

### May Keep Temporarily
- @biomejs/biome (linting - decide later)
- husky (git hooks - decide later)
- snyk (security scanning - decide later)

### Development Only (can keep)
- @types/* (TypeScript definitions)

## Deployment

- Hosted on statichost.eu
- Uses statichost.yml for configuration
- Automatic builds on git push
- Must maintain compatibility with existing deploy process
