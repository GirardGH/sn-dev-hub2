# Sécurisation des imports XML — activation validée

État : migration appliquée sur Supabase et code installé dans l’application locale le 21 octobre 2026. Le parseur et l’aperçu restent inchangés.

## Comportement conservé

- Parseur, registre des tables, analyse XML et aperçu : fichiers identiques à la version installée.
- Exports directs, Update Sets et conservation des tables inconnues.
- Sélection des composants et choix créer / mettre à jour / ignorer.
- Mise à jour sans cible résolue : création, comme auparavant.
- XML brut, scripts, configurations et champs inconnus conservés.
- L’archivage initial du fichier reste séparé de la validation des développements : en cas d’échec, une archive à l’état parsed peut rester, sans développement partiellement enregistré.

## Protection ajoutée

Une seule fonction PostgreSQL effectue les insertions, les mises à jour, le bilan et le statut imported dans une transaction. Une erreur annule tous ces changements. Les cibles de mise à jour doivent correspondre à l’espace, au client et à la story choisis.

Le même import verrouillé peut être retenté avec les mêmes sélections sans répéter les écritures. Un résultat déjà finalisé ne peut plus être réinitialisé. Le formulaire conserve l’ID d’archive lors d’une nouvelle tentative dans le même formulaire et bloque les doubles clics concurrents. Une réanalyse du bilan ne supprime pas ce suivi.

L’opération reste soumise aux règles RLS et aux droits du compte connecté (SECURITY INVOKER). Aucun accès anonyme ni rôle administrateur supplémentaire n’est ajouté.

## Migration additive

`20261021000100_atomic_xml_import.sql` ajoute deux colonnes nullables à xml_imports, un trigger de protection du résultat final et la fonction de validation. Aucune ligne existante n’est réécrite. Ne pas rejouer les anciennes migrations pour appliquer cette correction.

Ordre d’activation : relever les volumes et empreintes métier ; appliquer uniquement cette migration ; vérifier colonnes, fonction et droits ; vérifier les empreintes ; installer les actions et le formulaire. En cas d’échec avant activation, conserver le code actuel. Une fois la migration installée, le code précédent demeure compatible.

## Contrôles effectués

- Intégration PostgreSQL isolée : créations, mises à jour, éléments ignorés/non sélectionnés, repli update → create, conservation des valeurs XML/config, reprise identique sans changement des timestamps, refus de nouvelles sélections sur un import terminé.
- Échec volontaire après une création et une mise à jour : rollback intégral ; l’archive reste parsed.
- Refus d’une cible dans une autre story, de parents incohérents, de comptes extérieurs et de l’exécution anonyme.
- Réanalyse du bilan : résultat de reprise conservé ; réinitialisation du résultat final refusée.
- Action serveur : un seul appel RPC, espace actif imposé, payload des composants conservé, erreurs propagées avant invalidation de succès.
- Navigateur, avec le parseur inchangé : Business Rule directe, Update Set payload, table inconnue, widget, Flow simple, XML invalide. Les scripts et conditions de la Business Rule sont vérifiés, avec caractères spéciaux.
- Compilation de production réussie ; aucun changement de seuil de taille des fichiers dans ce lot. Le traitement des gros volumes reste un chantier distinct.

## Activation sur Supabase réel

- Fonction installée avec SECURITY INVOKER ; exécution authentifiée autorisée, anonyme refusée ; colonnes et trigger présents.
- Test transactionnel réel sous le rôle authenticated : création d’un import, validation et reprise identique ; un seul développement obtenu. Toutes les écritures de ce test ont été annulées avec ROLLBACK.
- Avant/après migration et test : mêmes volumes et mêmes empreintes de toutes les lignes des quatre tables (colonnes métier existantes) : 15 clients, 46 stories, 651 développements, 48 imports. Aucun contenu métier existant modifié.
- Toutes les suites npm test réussies dans le projet installé. Formulaire XML chargé dans le navigateur avec la session existante ; tableau de bord personnel conservé à 12 clients / 41 stories / 579 développements.
- Compilation de production validée dans la copie isolée du même code ; aucune nouvelle importation de fichier utilisateur n’a été soumise par l’interface pendant cette activation.

Les limites de taille/décompression, les gros volumes et les autres chantiers de l’audit restent à traiter avant le déploiement public.
