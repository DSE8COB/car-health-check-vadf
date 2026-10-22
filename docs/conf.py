# Configuration file for the Sphinx documentation builder.

project = 'Car Health Check'
copyright = '2026'
author = 'Dinesh Senthilvel'
release = '1.0.0'

# Extensions
extensions = [
    'myst_parser'
]

# Markdown support
source_suffix = {
    '.md': 'markdown',
}

master_doc = 'index'

# Templates
templates_path = ['_templates']

# Exclude files
exclude_patterns = [
    '_build',
    'Thumbs.db',
    '.DS_Store'
]

# HTML Theme
html_theme = 'sphinx_rtd_theme'

# Static files
html_static_path = ['_static']

# Site title
html_title = 'Car Health Check Documentation'

# Optional logo
# html_logo = "_static/logo.png"

# Optional favicon
# html_favicon = "_static/favicon.ico"

# Enable section anchors
myst_heading_anchors = 3
