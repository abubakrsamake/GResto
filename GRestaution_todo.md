# PROMPT DE CONCEPTION : Application de Gestion de Restauration (POS Desktop pywebview + Web Multi-Points de Vente)

## Context & Vision
Je souhaite concevoir et développer une application moderne de gestion pour établissement de restauration (restaurant, chaîne, fast-food). 
L'application comporte deux volets :
1. **Un back-office Web** pour l'administration globale (gestion des utilisateurs, menus, rapports, multi-points de vente).
2. **Une application Desktop / Kiosque Vendeur (POS)** exécutée via `pywebview` sur les terminaux de caisse pour la vente rapide, la prise de commande tactile et l'impression directe des tickets de caisse.

## Stack Technique Imposée
- **Frontend :** React (TypeScript) + Vite + Tailwind CSS + TanStack Query + Zustand
- **Backend Central / API :** FastAPI (Python) + SQLAlchemy 2.0 (Async) + Pydantic v2 + Alembic + WebSockets
- **Base de données :** PostgreSQL
- **Desktop Application (Client POS Caisse) :** Python avec `pywebview` (embarquant le build React) + pont Python-JS (API Python exposée au Frontend pour le matériel local)

---

## 1. Architecture Système & Intégration pywebview

Génère une architecture claire et modularisée :

### A. Architecture Hybride (Serveur Central + Clients Desktop pywebview)
- Explique comment le client `pywebview` interagit avec l'API FastAPI distante et la base PostgreSQL centrale.
- Propose la stratégie de déploiement de `pywebview` : embarquement du build statique React (`dist`) directement dans l'exécutable Python (via PyInstaller/Nuitka) pour un démarrage ultra-rapide.
- **Intégration Matérielle (Pont Python / JavaScript) :**
  - Utilisation du mécanisme `window.pywebview.api` pour communiquer entre React et Python.
  - Implémentation des fonctions natives Python pour :
    - Impression directe sur imprimante thermique de caisse (ESC/POS via USB/Série/Réseau).
    - Ouverture automatique du tiroir-caisse (signal envoyé à l'imprimante).
    - Mode plein écran / Kiosque verrouillé (bloquer le basculement d'application pour les vendeurs).

### B. Modèle de Données PostgreSQL
Structure des tables principales :
1. **Utilisateurs & Auth :** `users`, `roles` (SuperAdmin, Admin, Manager, Serveur, Caissier, Cuisinier), `user_pos_access`.
2. **Multi-Points de Vente & Caisses :** `points_of_sale`, `registers` (caisses physiques identifiées par terminal `pywebview`).
3. **Catalogue & Menu :** `categories`, `products`, `variants`/`modifiers` (ex: cuissons, suppléments), `prices_by_pos`.
4. **Commandes & Ventes :** `orders`, `order_items`, `payments`, `tables`, `register_sessions` (ouvertures/fermetures de caisse, fond de caisse).

### C. WebSockets & Temps Réel
- Synchronisation en temps réel via WebSockets FastAPI entre le client POS (`pywebview`) et le système d'affichage cuisine (KDS) ou les autres terminaux.

---

## 2. Structure de l'Application Client Desktop (`pywebview`)

Détaille l'architecture du conteneur `pywebview` :
1. **Script principal Python (`main.py`) :**
   - Initialisation de la fenêtre `pywebview`.
   - Activation du mode Kiosque / Fullscreen.
   - Classe `Api` exposant les méthodes natives (`print_ticket()`, `open_cash_drawer()`, `get_printer_status()`).
2. **Côté React :**
   - Hook personnalisé `usePywebview()` pour détecter la présence de l'environnement desktop et appeler les fonctions natives en toute sécurité.

---

## 3. Fonctionnalités Clés & Modules

1. **Gestion des Utilisateurs & Sessions de Caisse :**
   - Connexion rapide par code PIN/Badge caissier sur le POS Desktop.
   - Ouverture/Fermeture de caisse (saisie du fond de caisse, calcul d'écart automatique).

2. **Interface Vendeur / POS Tactile (React dans pywebview) :**
   - Layout optimisé pour écran tactile (grilles de produits grands boutons).
   - Panier interactif (modification des quantités, ajouts de suppléments/notes).
   - Multi-modes d'encaissement (Espèces, Carte, Mobile Money) avec impression automatique du reçu ESC/POS dès validation.

3. **Écran Cuisine / KDS (Web / Desktop) :**
   - Affichage dynamique des commandes envoyées depuis les terminaux POS.

4. **Administration Back-Office (Web Dashboard) :**
   - Configuration centralisée des prix, stocks, utilisateurs et rapports de vente inter-points de vente.

---

## 4. Feuille de Route & Méthodologie

1. **Phase 1 : Core Backend & Auth (FastAPI + PostgreSQL)**
   - API REST, JWT, modèles SQLAlchemy, gestion multi-POS et RBAC.
2. **Phase 2 : Frontend POS React**
   - Interface tactile du panier, catalogue, sélection des options et paiement.
3. **Phase 3 : Intégration pywebview & Matériel**
   - Création de l'application wrapper Python avec `pywebview`.
   - Création du bridge JS-Python pour l'impression thermique ESC/POS et le tiroir-caisse.
4. **Phase 4 : Temps réel WebSockets & Sessions Caisse**
   - Flux de commandes en direct vers la cuisine et rapports de caisse (Z/X).
5. **Phase 5 : Packaging & Déploiement**
   - Build du frontend React.
   - Compilation de l'application Python + `pywebview` en un fichier exécutable `.exe` (Windows) ou binaire Linux avec PyInstaller.

---

## Livrable Attendu
Donne-moi :
1. Le schéma de base de données relationnel complet (SQL ou Mermaid).
2. La structure de dossiers complète du projet (Backend FastAPI, Frontend React, et Wrapper `pywebview`).
3. Un exemple de code pour le pont Python-JS dans `pywebview` (script Python avec la classe `Api` d'impression ESC/POS + le hook React qui l'utilise).