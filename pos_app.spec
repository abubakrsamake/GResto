# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# --- COLLECTE DES DEPENDANCES & DONNEES ---
# Inclut les schémas, modèles, templates et assets statiques du Frontend (build React)
datas = [
    ('frontend/dist', 'frontend/dist'),
    ('desktop/logogresto.ico', 'desktop'),
]

# Récupération automatique des données Uvicorn et Pydantic
datas += collect_data_files('uvicorn')
datas += collect_data_files('pydantic')
datas += collect_data_files('webview')

# Modules masqués (Hidden Imports) indispensables pour FastAPI/Uvicorn & pywebview
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'webview',
    'clr', # Nécessaire pour pywebview sous Windows (.NET Bridge)
    'pydantic_settings',
    'sqlalchemy.dialects.sqlite',
    'app',
    'desktop.printer_service',
]
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('pydantic')
hiddenimports += collect_submodules('app')

a = Analysis(
    ['desktop/main.py'],
    pathex=['.', 'backend', 'desktop'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='POS_Terminal',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compresse l'exécutable avec UPX si disponible
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set à False pour masquer la fenêtre d'invite de commande (Mode Desktop GUI)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='desktop/logogresto.ico',
)