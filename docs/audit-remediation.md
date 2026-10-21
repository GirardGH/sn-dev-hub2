# Correctifs de l’audit — suivi au 21 octobre 2026

## Premier lot installé

- Next.js 14.2.35 → 16.4.2 ; React/React DOM 19.3.1 ; types React 19.
- APIs cookies asynchrones et paramètre asynchrone du téléchargement ; middleware renommé proxy (Node). Routes et protections testées.
- Tailwind 4.3.3 et son plugin PostCSS. Configuration de couleurs existante conservée ; noms d’utilitaires adaptés pour conserver leurs dimensions/ombres.
- ESLint utilise la configuration plate officielle Next.js et une commande autonome. Les plugins actuels déclarent ESLint 9 ; la version compatible 9.39.5 est conservée malgré son avertissement de fin de support. Prévoir ESLint 10 lorsque leurs plages de compatibilité seront mises à jour.
- DOMPurify transitif verrouillé sur 3.4.17 pour retirer les avis signalés sous Monaco.
- Les actions serveur clients/stories/développements valident leurs entrées Zod avant toute écriture : nom/titre non vide après nettoyage, longueur, identifiants UUID, nombre d’UO fini et non négatif, configuration sérialisable de 2 Mo maximum.
- Export CSV : guillemets et entêtes échappés, cellules susceptibles d’être interprétées comme formules neutralisées.

## Résultat des contrôles

- Compilation de production réussie sur Next.js 16.4.2.
- Huit suites de tests : formulaires, fichiers, langues, portée d’espace, intégration PostgreSQL des espaces/copies, Google OAuth et sécurité CSV/validation.
- Vérification navigateur avec la session existante : tableau de bord 12 clients / 41 stories / 579 développements ; liste clients et fiche AIRBUS accessibles ; alternance des lignes conservée ; console sans erreur. Lecture seulement, aucune sauvegarde de fiche exécutée pendant cette recette.
- `npm audit --omit=dev` : 0 alerte au contrôle du 21 octobre 2026. Ce contrôle de dépendances n’est pas une preuve d’absence de toute vulnérabilité ni un audit des scripts externes chargés au runtime.
- `npm audit` complet : 5 alertes élevées dans la chaîne ESLint → fast-glob → micromatch → braces. La dernière version publiée de braces reste signalée ; les paquets de production ne dépendent plus de cette chaîne. Aucune rétrogradation de Next.js ni correctif forcé appliqué pour masquer ces alertes.
- Lint : aucune erreur, six avertissements sur les effets React existants (chargement de préférences/données). La nouvelle recommandation `set-state-in-effect` reste visible en avertissement ; les règles de correction des hooks restent actives.

## Chantiers encore ouverts

1. Imports XML : limites d’entrée/décompression et traitement des gros volumes. Atomicité, reprise dans le même formulaire et validation des cibles installées ; voir xml-import-atomic.md.
2. Historique de migrations à versions uniques, avec réconciliation des opérations déjà exécutées sur le Supabase réel avant tout rejeu.
3. Pagination, tri/recherche côté serveur et projections légères pour les listes.
4. Recherche globale robuste et couvrant le code.
5. Corbeille/restauration des entités, traitement maîtrisé des fichiers orphelins.
6. Configuration d’hébergement, SMTP, domaine/URLs OAuth, sauvegarde et restauration BDD + Storage, journaux et recette multi-utilisateur.

Aucune migration Supabase ni suppression de donnée n’a été exécutée pour ce premier lot. Le déploiement public reste conditionné aux autres points de l’audit.

## Références

- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://tailwindcss.com/docs/upgrade-guide

## Deuxième lot installé — import XML

Migration additive 20261021000100 appliquée sur Supabase et correctif local activé. Import transactionnel, reprise idempotente et protection des parents ; parseur et aperçu inchangés. Vérification réelle sous rôle authenticated avec rollback de toutes les données de test. Volumes et empreintes métier avant/après identiques : 15 clients, 46 stories, 651 développements et 48 imports. Toutes les suites npm test du projet installé réussies. Détails : xml-import-atomic.md.
