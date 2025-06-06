// extract-enhanced.js - Version qui capture TOUS les éléments même sans styles définis
const fetch = require('node-fetch');

const FIGMA_ACCESS_TOKEN = 'yourapikey';
const FILE_KEY = 'pageid'; // depuis l'URL figma.com/file/FILE_KEY/...

const baseUrl = 'https://api.figma.com/v1';

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function fetchFile() {
  console.log('📁 Récupération du fichier Figma...');
  const response = await fetch(`${baseUrl}/files/${FILE_KEY}`, {
    headers: { 'X-Figma-Token': FIGMA_ACCESS_TOKEN }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
  }
  
  return response.json();
}

// Analyse approfondie de tous les éléments
async function analyzeAllElements() {
  console.log('🔍 Analyse approfondie de tous les éléments...');
  const fileData = await fetchFile();
  
  const analysis = {
    colors: new Set(),
    components: {},
    textStyles: new Set(),
    commonSizes: new Set(),
    commonSpacing: new Set(),
    borderRadius: new Set()
  };

  function analyzeNode(node, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}📦 ${node.type}: "${node.name}"`);

    // Capturer les couleurs utilisées
    if (node.fills && node.fills.length > 0) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          analysis.colors.add(`${hex} (from: ${node.name})`);
        }
      });
    }

    // Capturer les propriétés de layout intéressantes
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const props = extractDetailedProperties(node);
      if (Object.keys(props).length > 0) {
        analysis.components[node.name] = props;
      }
    }

    // Capturer les styles de texte
    if (node.type === 'TEXT') {
      const textStyle = `${node.style?.fontFamily || 'Unknown'} ${node.style?.fontSize || 0}px ${node.style?.fontWeight || 400}`;
      analysis.textStyles.add(textStyle);
    }

    // Dimensions communes
    if (node.absoluteBoundingBox) {
      analysis.commonSizes.add(`${Math.round(node.absoluteBoundingBox.width)}x${Math.round(node.absoluteBoundingBox.height)}`);
    }

    // Espacements
    if (node.itemSpacing) {
      analysis.commonSpacing.add(node.itemSpacing);
    }
    if (node.paddingTop) {
      [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].forEach(p => {
        if (p > 0) analysis.commonSpacing.add(p);
      });
    }

    // Border radius
    if (node.cornerRadius && node.cornerRadius > 0) {
      analysis.borderRadius.add(node.cornerRadius);
    }

    // Récursion sur les enfants (limiter la profondeur pour éviter trop de logs)
    if (node.children && depth < 3) {
      node.children.forEach(child => analyzeNode(child, depth + 1));
    }
  }

  // Analyser toutes les pages
  fileData.document.children.forEach((page, index) => {
    console.log(`\n📄 Page ${index + 1}: "${page.name}"`);
    page.children.forEach(child => analyzeNode(child, 1));
  });

  return analysis;
}

function extractDetailedProperties(node) {
  const props = {};

  // Dimensions
  if (node.absoluteBoundingBox) {
    props.width = Math.round(node.absoluteBoundingBox.width);
    props.height = Math.round(node.absoluteBoundingBox.height);
  }

  // Layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    props.layoutMode = node.layoutMode;
    props.itemSpacing = node.itemSpacing || 0;
    if (node.primaryAxisAlignItems) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) props.counterAxisAlignItems = node.counterAxisAlignItems;
  }

  // Padding
  if (node.paddingTop !== undefined) {
    props.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    };
  }

  // Apparence
  if (node.cornerRadius) props.cornerRadius = node.cornerRadius;

  // Couleurs
  if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
    const fill = node.fills[0];
    props.backgroundColor = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
  }

  if (node.strokes && node.strokes.length > 0) {
    props.strokeWeight = node.strokeWeight || 0;
    if (node.strokes[0].type === 'SOLID') {
      props.borderColor = rgbToHex(node.strokes[0].color.r, node.strokes[0].color.g, node.strokes[0].color.b);
    }
  }

  return props;
}

function generateDetailedPrompt(analysis) {
  let prompt = "DESIGN SYSTEM MATERIAL DESIGN - Analysé depuis Figma:\n\n";
  
  // Couleurs trouvées
  if (analysis.colors.size > 0) {
    prompt += "=== COULEURS UTILISÉES ===\n";
    Array.from(analysis.colors).slice(0, 10).forEach(color => {
      prompt += `${color}\n`;
    });
    if (analysis.colors.size > 10) {
      prompt += `... et ${analysis.colors.size - 10} autres couleurs\n`;
    }
    prompt += "\n";
  }
  
  // Styles de texte
  if (analysis.textStyles.size > 0) {
    prompt += "=== STYLES DE TEXTE TROUVÉS ===\n";
    Array.from(analysis.textStyles).slice(0, 8).forEach(style => {
      prompt += `${style}\n`;
    });
    prompt += "\n";
  }

  // Espacements communs
  if (analysis.commonSpacing.size > 0) {
    prompt += "=== SYSTÈME D'ESPACEMENTS ===\n";
    const spacings = Array.from(analysis.commonSpacing).sort((a, b) => a - b);
    prompt += `Valeurs trouvées: ${spacings.slice(0, 10).join('px, ')}px\n\n`;
  }

  // Border radius
  if (analysis.borderRadius.size > 0) {
    prompt += "=== BORDER RADIUS ===\n";
    const radius = Array.from(analysis.borderRadius).sort((a, b) => a - b);
    prompt += `Valeurs: ${radius.join('px, ')}px\n\n`;
  }

  // Composants intéressants
  const interestingComponents = Object.entries(analysis.components)
    .filter(([name, props]) => Object.keys(props).length > 3)
    .slice(0, 8);

  if (interestingComponents.length > 0) {
    prompt += "=== COMPOSANTS ANALYSÉS ===\n";
    interestingComponents.forEach(([name, props]) => {
      prompt += `${name}:\n`;
      if (props.width && props.height) {
        prompt += `  - Dimensions: ${props.width}x${props.height}px\n`;
      }
      if (props.padding) {
        const p = props.padding;
        prompt += `  - Padding: ${p.top}/${p.right}/${p.bottom}/${p.left}px\n`;
      }
      if (props.cornerRadius) {
        prompt += `  - Border radius: ${props.cornerRadius}px\n`;
      }
      if (props.backgroundColor) {
        prompt += `  - Background: ${props.backgroundColor}\n`;
      }
      if (props.layoutMode) {
        prompt += `  - Layout: ${props.layoutMode}, spacing: ${props.itemSpacing}px\n`;
      }
      prompt += "\n";
    });
  }

  // Dimensions communes
  if (analysis.commonSizes.size > 0) {
    prompt += "=== TAILLES COMMUNES ===\n";
    const sizes = Array.from(analysis.commonSizes).slice(0, 10);
    prompt += `${sizes.join(', ')}\n\n`;
  }

  prompt += "=== INSTRUCTIONS ===\n";
  prompt += "Ce design system est basé sur Material Design.\n";
  prompt += "Utilise ces couleurs, espacements et patterns pour créer des composants cohérents.\n";
  prompt += "Respecte les principes Material Design pour l'élévation et les interactions.\n";

  return prompt;
}

async function extractDesignSystemEnhanced() {
  try {
    console.log('🚀 Analyse approfondie du design system Material Design...\n');
    
    if (FIGMA_ACCESS_TOKEN === 'REMPLACER_PAR_VOTRE_TOKEN') {
      throw new Error('❌ Veuillez configurer FIGMA_ACCESS_TOKEN');
    }

    const analysis = await analyzeAllElements();

    console.log('\n✅ Analyse terminée !\n');
    console.log(`📊 Éléments trouvés:`);
    console.log(`  - ${analysis.colors.size} couleurs uniques`);
    console.log(`  - ${analysis.textStyles.size} styles de texte`);
    console.log(`  - ${Object.keys(analysis.components).length} composants analysés`);
    console.log(`  - ${analysis.commonSpacing.size} valeurs d'espacement`);
    console.log(`  - ${analysis.borderRadius.size} valeurs de border-radius\n`);

    const prompt = generateDetailedPrompt(analysis);

    console.log('📋 PROMPT POUR CLAUDE (à copier):');
    console.log('=' + '='.repeat(60));
    console.log(prompt);
    console.log('=' + '='.repeat(60));

    return { analysis, prompt };

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

extractDesignSystemEnhanced();