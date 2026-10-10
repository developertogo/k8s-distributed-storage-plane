const express = require('express');
const router = express.Router();
const path = require('path');
const openapiSpec = require('../docs/openapi.json');

// GET /api-docs/swagger.json
router.get('/swagger.json', (req, res) => {
  res.json(openapiSpec);
});

// GET /api-docs - Standalone, zero-dependency CDN-powered Swagger UI
router.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DGX Cloud Storage Plane - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .topbar { display: none !important; }
    .swagger-ui .info { margin: 25px 0; }
    .swagger-ui .info .title { font-size: 28px; color: #10b981; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openapiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
  res.send(html);
});

module.exports = router;
