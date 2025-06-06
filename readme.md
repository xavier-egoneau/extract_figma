# Guide Setup - Extracteur Design System Figma

## 1. Préparation

### Créer un token d'accès Figma
1. Aller sur https://www.figma.com/developers/api#access-tokens
2. Cliquer "Create a new personal access token"
3. Donner un nom (ex: "Design System Extractor")
4. Copier le token généré (format: `figd_XXXXX...`)

### Récupérer le FILE_KEY
1. Ouvrir votre fichier Figma dans le navigateur
2. L'URL ressemble à: `https://www.figma.com/file/ABC123DEF456/Mon-Design-System`
3. Le FILE_KEY est la partie `ABC123DEF456`

## 2. Installation

### Créer le projet
```bash
mkdir figma-extractor
cd figma-extractor
npm init -y
npm install node-fetch
```

### Créer le fichier extract.js
```javascript
// extract.js
const fetch = require('node-fetch');

const FIGMA_ACCESS_TOKEN = 'REMPLACER_PAR_VOTRE_TOKEN';
const FILE_KEY = 'REMPLACER_PAR_VOTRE_FILE_KEY';

// [Copier tout le code de l'artifact "FigmaDesignSystemExtractor" ici]

// Appel principal
extractDesignSystem()
  .then(result => {
    console.log('\n🎉 Extraction terminée !');
    console.log('\n📋 PROMPT POUR CLAUDE (à copier):');
    console.log('=' + '='.repeat(50));
    console.log(result.claudePrompt);
    console.log('=' + '='.repeat(50));
  })
  .catch(error => {
    console.error('❌ Erreur:', error.message);
  });
```

## 3. Configuration

### Modifier extract.js
1. Remplacer `FIGMA_ACCESS_TOKEN` par votre token
2. Remplacer `FILE_KEY` par votre clé de fichier

### Structure attendue du projet
```
figma-extractor/
├── package.json
├── extract.js
└── node_modules/
```

## 4. Exécution

```bash
node extract.js
```

## 5. Résultat attendu

Le script va afficher dans la console :

```
=== DESIGN TOKENS ===
{
  "colors": {
    "Primary/Blue": {
      "hex": "#0066CC",
      "rgb": { "r": 0, "g": 0.4, "b": 0.8 }
    }
  }
}

=== COMPONENTS ===
{
  "Button/Primary": {
    "type": "COMPONENT",
    "properties": {
      "width": 120,
      "height": 40,
      "paddingTop": 12
    }
  }
}

📋 PROMPT POUR CLAUDE (à copier):
==================================================
DESIGN SYSTEM EXISTANT - À utiliser dans tes prompts:

=== COULEURS ===
Primary/Blue: #0066CC (RGB: 0, 102, 204)
Success/Green: #22C55E (RGB: 34, 197, 94)

=== TYPOGRAPHIE ===
Heading/Large: Inter 24px, weight 600
Body/Regular: Inter 16px, weight 400

=== COMPOSANTS ===
Button/Primary:
  - Dimensions: 120x40px
  - Padding: 12/24/12/24px
  - Border radius: 8px
  - Layout: HORIZONTAL, spacing: 8px

==================================================
```

## 6. Utilisation
0. **Copier les guideline depuis le plugin dans Figma pour instruire l'ia**
1. **Lancer la commande npm run start**
2. **Copier la section "PROMPT POUR CLAUDE"** (entre les === lignes)
3. **La coller dans notre conversation Claude**
4. **Demander à Claude d'utiliser ce design system** pour créer de nouveaux composants

## Troubleshooting

### Erreurs communes
- **401 Unauthorized**: Vérifier le token d'accès
- **404 Not Found**: Vérifier le FILE_KEY
- **Module not found**: Installer node-fetch avec `npm install node-fetch`

### Vérification
- Le token commence par `figd_`
- Le FILE_KEY fait ~22 caractères alphanumériques
- Le fichier Figma est accessible (pas privé)