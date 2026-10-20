# Formulaires de développement ServiceNow

Les champs sont issus d’un relevé en lecture seule de l’instance `dev389937` effectué le 20 octobre 2026 via SN Utils. Le fichier `serviceNowSchema.json` contient les libellés, types et choix relevés pour 36 tables, ainsi que les contraintes et références accessibles dans le dictionnaire. Aucune session ni clé d’accès n’est stockée dans ce relevé.

## Fonctionnement

- La hiérarchie Client → Story → Développement et le stockage `config` JSON restent inchangés. Aucune migration SQL n’est nécessaire.
- Les champs principaux sont visibles ; les autres champs métier du dictionnaire sont dépliables. Les métadonnées importées sont consultables en lecture seule.
- Les champs de filtre encodé sont distincts des conditions JavaScript. Les champs conditionnels masqués restent conservés.
- Les saisies sont mémorisées par type pendant la modification du formulaire. Changer de type ne remplace plus la table cible par la table technique de l’artefact.
- Les anciens noms de champs restent compatibles, notamment les Business Rules, Client Scripts, UI Policies et widgets. Les anciennes valeurs ne sont pas réécrites en base à l’ouverture.
- Le formulaire spécialisé des notifications et l’aperçu Flow existants sont conservés. Les notifications disposent aussi du dictionnaire complet dépliable.

## Nouveaux types

Scripted REST Resource ; Catalog Client Script ; Catalog UI Policy ; UI Policy Action ; Catalog UI Policy Action ; UI Page ; UI Macro ; Email Script ; Transform Script ; REST Message ; REST Message HTTP Method ; Catalog Variable ; Variable Set ; Data Policy ; Data Policy Rule ; Event Registration.

Le sélecteur passe de 22 à 38 types. Les anciens types importés portant directement le nom d’une table restent éditables : lorsqu’un schéma est disponible, le formulaire correspondant est utilisé, sans changement de type en base.

## Import XML

Les futurs imports directs et Update Sets conservent chaque champ direct du record, y compris les champs vides, les références brutes et les espaces du code. Les libellés des références sont conservés séparément dans `_snDisplayValues`. Le marqueur `_snFormVersion` distingue les nouvelles configurations des anciens alias.

Pour une ancienne Business Rule, `config.condition` représentait le filtre encodé : il est affiché comme `filter_condition` dans le nouveau formulaire. Les nouveaux imports conservent séparément `condition` et `filter_condition`. Les anciennes données manquantes ne sont pas inventées ni récupérées automatiquement depuis les anciens XML.

## Limites de l’archive

Il s’agit de formulaires d’archivage enrichis avec les champs de l’instance, pas d’une exécution du moteur ServiceNow. Les références se saisissent en texte, les conditions en filtre encodé ; il n’y a pas de recherche distante ni de constructeur graphique de filtres. Les UI Policies, Client Scripts et vues personnalisées de l’instance ne sont pas exécutés dans l’archive. Quelques dépendances d’affichage usuelles sont reproduites pour les formulaires principaux.

Les listes associées (rôles ACL, variables, actions de politique, etc.) sont des enregistrements distincts dans ServiceNow ; les types ajoutés permettent de les archiver séparément. Les tableaux et objets déjà archivés sont conservés et affichés en JSON en lecture seule. Les contraintes « requis dans ServiceNow » sont indiquées sans empêcher l’archivage d’un développement partiel.

## Vérification

`npm run test:forms` vérifie les anciens alias, la séparation des conditions, les booléens, la conservation des champs et les nouveaux types. TypeScript, lint et compilation Next.js ont été exécutés. Une vérification dans un navigateur isolé a contrôlé les changements de type, l’affichage conditionnel et les imports XML directs/Update Sets avec des données fictives. Aucun enregistrement de production n’a été créé pour ces tests.
