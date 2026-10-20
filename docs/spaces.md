# Espaces personnels et sociétés

## Utilisation

Chaque compte conserve un espace personnel privé, avec la même hiérarchie Client → Story → Développement. Le sélecteur dans la navigation change l’espace actif ; les listes, recherches, compteurs, imports XML et pièces jointes sont filtrés sur cet espace. Un ancien cookie pointant vers un espace retiré revient automatiquement à l’espace personnel.

La page **Espaces** permet à l’administrateur global de créer une société. L’administrateur de société personnalise son nom, sa couleur et son URL de logo HTTPS, puis ajoute les comptes déjà inscrits par leur email exact. Aucun compte partagé ni email automatique. L’administration globale ne donne pas accès aux contenus personnels d’autrui.

| Rôle | Consulter/télécharger | Créer/modifier | Supprimer les contenus | Gérer les membres |
|---|---|---|---|---|
| Lecteur | Oui | Non | Non | Non |
| Contributeur | Oui | Oui | Non | Non |
| Administrateur | Oui | Oui | Oui | Oui |

Les pièces jointes utilisent toujours la corbeille existante. Le retrait restaurable d’un fichier est une modification accessible aux contributeurs. La révocation d’un membre ne supprime aucun contenu de société. Le dernier administrateur ne peut pas être retiré ou rétrogradé. La suppression de comptes Auth et le transfert de propriété des sociétés ne sont pas exposés par cette fonctionnalité ; les références actuelles peuvent bloquer une suppression de compte, ce qui préserve les contenus.

## Copies indépendantes

Sur une fiche client, story ou développement déjà enregistré, **Copier vers un espace** propose uniquement les destinations dans lesquelles l’utilisateur peut créer du contenu. La source doit être lisible ; un lecteur peut donc copier un contenu consultable vers un espace où il est contributeur. Le rôle lecteur n’est pas une interdiction d’export.

- Un client copie ses stories et développements.
- Une story copie ses développements, avec copie/réutilisation ou sélection d’un client destinataire.
- Un développement copie/réutilise ses parents, ou utilise un client/une story existants sélectionnés.
- Les fichiers actifs sont copiés dans de nouveaux objets Storage privés. Les fichiers de corbeille ne sont pas partagés.
- Les identifiants et contenus source sont conservés. Les nouveaux enregistrements ont leurs propres identifiants, dates et fichiers. Le lien d’import XML n’est pas réutilisé entre espaces ; le XML brut de chaque développement reste archivé. La copie d’un client ne copie pas l’historique complet des imports XML.
- Un même élément source déjà copié vers une destination est réutilisé sans écrasement. Les contenus modifiés dans la copie ne sont pas resynchronisés. Les nouveaux enfants d’une source peuvent être ajoutés par une nouvelle copie du parent.
- L’aperçu montre les contenus source et les copies connues. Les parents sélectionnés sont réutilisés au lieu d’être créés. La comparaison porte sur la provenance, pas sur un simple nom : deux clients homonymes non liés ne sont jamais fusionnés automatiquement.

La copie des enregistrements s’effectue dans une transaction PostgreSQL. Les nouveaux enregistrements sont masqués par RLS tant que le job n’est pas terminé. Le serveur copie ensuite les fichiers via l’API Storage, puis une finalisation transactionnelle vérifie l’existence et la taille de chaque objet. En cas d’interruption, **Espaces → Copies interrompues → Reprendre** réutilise le même job et les fichiers déjà transférés. Les contenus existants de la destination ne sont jamais masqués.

Les jobs et liens de provenance restent conservés. Une copie interrompue n’a pas encore d’option d’annulation/purge dans l’interface : elle peut être reprise, et une maintenance administrative pourra nettoyer les jobs abandonnés via les API Storage, sans suppression SQL directe des objets.

## Modèle et protections

- `spaces`, `space_members`, `platform_admins` : espaces, appartenances et administration globale.
- `space_copy_jobs`, `space_copy_links` : reprise et anti-doublons des copies indépendantes.
- `space_id` sur clients, stories, développements, imports XML et métadonnées de pièces jointes.
- `copy_job_id` sur les nouveaux clients/stories/développements copiés.
- `user_id` reste l’attribution de création ; les accès collaboratifs utilisent l’espace.
- RLS vérifie les rôles indépendamment du serveur. Les changements de membres sont des RPC étroites, avec recherche d’email exacte et protection du dernier administrateur. Les fonctions internes de copie ne sont pas exécutables par les clients API.
- Les triggers empêchent de déplacer des enregistrements entre espaces et de rattacher une story/développement à des parents incompatibles. Le partage passe par une copie.
- `createSpaceSupabaseClient` ajoute le filtre d’espace à toutes les lectures/modifications métier et injecte l’espace côté serveur à la création. Les recherches globales et imports utilisent ce même client. Les RPC de copie utilisent explicitement source et destination, avec contrôles SQL propres.
- Storage reste privé. Aucun écrasement d’objet prêt n’est autorisé. Un lien signé déjà émis reste utilisable jusqu’à son expiration (60 secondes), même si l’accès vient d’être révoqué.

## Migration

Appliquer les migrations `20261020_spaces.sql`, puis `20261020_space_copies.sql`, avant d’activer le nouveau code. Le livrable `migration-espaces.sql` les réunit dans une transaction et ajoute uniquement le compte d’administrateur global désigné.

Le rattachement initial crée un espace personnel par compte existant et renseigne `space_id` sur ses enregistrements, sans modifier IDs ou contenus. Les volumes et les relations entre propriétaires doivent être relevés avant/après. Une relation historique incohérente provoque une erreur et un rollback, plutôt qu’un déplacement silencieux des données.

Les anciennes règles RLS des tables métier sont remplacées par les règles d’espace ; les règles des profils et des configurations de listes personnelles sont conservées. Les comptes extérieurs ne deviennent membres d’aucune société automatiquement. Le MCP autonome créé précédemment n’est pas activé ni adapté par cette migration : il devra utiliser explicitement les espaces avant un futur déploiement.

## Vérifications

- `npm run test:spaces` : PostgreSQL isolé (PGlite), migration, reprise des relations, refus hors espace, rôles, refus d’escalade, dernier admin, copies invisibles avant finalisation, fichiers manquants, Storage privé, copie indépendante, répétition sans doublons, choix de parents et révocation.
- `npm run test:space-scope` : filtre d’espace, injections de destination, restrictions lecteur/contributeur.
- Tests existants des formulaires, pièces jointes et langues.
- Vérification navigateur sur données de démonstration : page de gestion, formulaire lecteur désactivé, actions d’écriture masquées, consultation des pièces jointes, navigation mobile et absence de débordement horizontal.

La validation finale sur Supabase doit également exercer une vraie copie Storage et vérifier les volumes de données personnelles après migration. PGlite simule les métadonnées Storage et ne remplace pas cette vérification du service hébergé.

## Activation du 20 octobre 2026

Migration appliquée sur Supabase ; code activé dans le projet local. Deux espaces personnels et le rôle global du compte désigné ont été vérifiés. Les empreintes des données historiques sont identiques avant/après : 14 clients, 44 stories, 649 développements, 48 imports et 1 pièce jointe. L’interface authentifiée affiche la gestion des espaces et la création de société. Le premier transfert physique de fichier entre sociétés sur Storage hébergé reste à vérifier. Aucun push GitHub ni déploiement public effectué.

## Copie multiple et rapprochement par nom

Les listes de clients/stories/développements et les listes associées proposent « Copier vers un espace (N) » après sélection. La sélection concerne les lignes visibles après filtrage. Un lecteur de la source peut exporter vers un espace où il a lui-même un droit d’écriture ; un contributeur ne reçoit pas pour autant le droit de suppression.

La migration `20261020_bulk_space_copies.sql` remplace la logique des copies simples et ajoute les RPC de lot. Elle ne modifie ni ne fusionne les données existantes. Maximum : 100 racines sélectionnées par opération ; les descendants sont inclus en cascade. Tous les enregistrements sélectionnés doivent appartenir au même espace source.

Rapprochement : client par `name` dans l’espace cible, story par `title` sous le client résolu, développement par `title` sous la story résolue. La casse et les espaces superflus sont ignorés ; accents et ponctuation restent significatifs. Des IDs personnels différents peuvent donc mener au même parent société. Les parents communs absents au début du lot sont créés une seule fois. Un client ou une story déjà présent est tout de même parcouru pour ajouter les descendants manquants.

Un développement de même nom est considéré comme déjà présent, même si son code ou son type diffère. Il n’est pas écrasé ; ses pièces jointes ne sont pas fusionnées avec celles de la source. Pour conserver deux variantes, leur donner des titres distincts. Les doublons historiques ne sont pas supprimés : plusieurs correspondances cibles au même niveau bloquent le lot avec un message d’ambiguïté.

Une seule transaction prépare tout le lot, puis les fichiers sont copiés par Storage et les nouveaux enregistrements deviennent visibles ensemble à la finalisation. Les copies concurrentes dans la même destination utilisent le verrou d’espace existant. Une opération interrompue est reprise depuis Espaces ; la même sélection réutilise le job en attente. Aucun écrasement d’enregistrement réutilisé.

Test dédié : `node scripts/test-bulk-space-copies.cjs` (PostgreSQL isolé), en complément de `npm run test:spaces` et des tests de régression.
