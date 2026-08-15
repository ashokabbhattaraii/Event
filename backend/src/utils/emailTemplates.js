const fs = require("fs");
const path = require("path");

// Resolve templates directory relative to this file
// Handle both normal require and node -e (where __dirname is .)
const BASE_DIR = process.cwd();
const TEMPLATES_DIR = path.resolve(BASE_DIR, "src", "templates", "emails");

const templateCache = new Map();

/**
 * Load and cache an email template
 * @param {string} templateName - Name of the template file (without .html)
 * @returns {string} - Template content
 */
function getTemplate(templateName) {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }
  
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }
  
  const content = fs.readFileSync(filePath, "utf8");
  templateCache.set(templateName, content);
  return content;
}

/**
 * Simple template renderer using {{variable}} syntax
 * Supports basic conditionals {{#if variable}}...{{/if}}
 * @param {string} template - Template string
 * @param {Object} data - Data object for interpolation
 * @returns {string} - Rendered template
 */
function renderTemplate(template, data = {}) {
  let result = template;
  
  // Handle {{#if variable}}...{{/if}} conditionals
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return data[key] ? content : "";
  });
  
  // Handle {{variable}} interpolation
  result = result.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
    const keys = key.split(".");
    let value = data;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return "";
      }
    }
    return value !== undefined && value !== null ? String(value) : "";
  });
  
  return result;
}

/**
 * Render an email template with data
 * @param {string} templateName - Template name (without .html)
 * @param {Object} data - Data for template interpolation
 * @returns {string} - Rendered HTML
 */
function renderEmail(templateName, data) {
  const template = getTemplate(templateName);
  return renderTemplate(template, data);
}

module.exports = { getTemplate, renderTemplate, renderEmail };