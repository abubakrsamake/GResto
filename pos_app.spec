# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# --- COLLECTE DES DEPENDANCES & DONNEES ---
# Inclut les schémas, modèles, templates et assets statiques du Frontend (build React)
datas = [
    ('frontend/dist', 'frontend/dist'),      # Dossier de build React (Vite/Webpack)
    ('backend/database.db', 'backend'),      # Base de données SQLite initiale si présente
]

# Récupération automatique des données Uvicorn et Pydantic
datas += collect_data_files('uvicorn')
datas += collect_data_files('pydantic')
datas += collect_data_files('pywebview')

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
    'engineio.async_drivers.asgi',
    'pywebview',
    'clr', # Nécessaire pour pywebview sous Windows (.NET Bridge)
    'pydantic_settings',
    'sqlalchemy.dialects.sqlite',
]
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('pydantic')

a = Analysis(
    ['app_runner.py'],  # Fichier Python principal qui lance FastAPI et pywebview
    pathex=['.'],
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
    icon='assets/icon.ico',  # Facultatif : Chemin de l'icône de ton application (.ico)
)