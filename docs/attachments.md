# Pièces jointes des développements

Le trombone du bandeau ouvre une fenêtre inspirée de la gestion des pièces jointes de ServiceNow : choix multiple de fichiers, glisser-déposer, liste des noms et des tailles. Le nom d’un fichier déclenche son téléchargement, sans affichage intégré de documents. Un nouveau développement doit être enregistré avant l’ajout de fichiers.

## Stockage et installation

Appliquer une seule fois `supabase/migrations/20261020_development_attachments.sql` après le schéma et les politiques existants. La migration crée :

- `public.development_attachments` pour les métadonnées et le lien vers le développement ;
- le bucket privé `development-attachments` pour les fichiers, avec une limite de 25 Mio (26 214 400 octets) par fichier ;
- les règles RLS du propriétaire sur les métadonnées et sur les objets Storage ;
- un contrôle en base empêchant de valider un fichier absent ou de taille différente.

Aucune clé administrateur n’est nécessaire dans l’application. Elle utilise la session Supabase de l’utilisateur. Les fichiers sont identifiés par un chemin calculé `utilisateur/développement/pièce-jointe`, indépendant du nom fourni. Les fichiers portant le même nom restent distincts.

Le transfert va directement du navigateur à Supabase Storage, puis l’application valide la pièce jointe. Seules les pièces validées apparaissent dans le formulaire. Un échec partiel d’un lot ne masque pas les fichiers effectivement envoyés. Un transfert échoué est nettoyé dans la mesure où le réseau le permet ; des transferts abandonnés peuvent rester en statut `pending` et nécessiter un contrôle administratif.

## Téléchargement et accès

La route `/api/attachments/[id]/download` vérifie la session et les droits RLS, puis redirige vers une URL de téléchargement signée valable 60 secondes. Une personne non connectée reçoit 401 ; une pièce inaccessible n’est pas révélée. Les réponses de redirection ne sont pas mises en cache. Le contenu est téléchargé sous son nom d’origine, y compris pour HTML ou SVG ; il n’est pas exécuté dans l’application.

Les fichiers retirés sont placés dans une corbeille restaurable. Ils ne sont plus proposés au téléchargement tant qu’ils n’ont pas été restaurés. Les fichiers de cette corbeille occupent toujours du stockage. Une URL signée déjà obtenue peut rester valable jusqu’à son expiration de 60 secondes.

## Maintenance

La suppression d’un développement supprime ses métadonnées de pièces jointes via la clé étrangère. Les binaires Storage ne sont pas supprimés par SQL : ils restent privés et les politiques empêchent de les récupérer sans métadonnée accessible. Pour récupérer cet espace, une maintenance administrative doit comparer les objets du bucket aux chemins de `development_attachments`, puis supprimer les objets orphelins via l’API Storage. Ne pas supprimer directement des lignes de `storage.objects` : cela ne supprime pas les fichiers physiques.

## Vérification

`npm run test:attachments` contrôle la validation des noms, types et tailles. `npm run test:forms` couvre les formulaires enrichis. Exécuter également TypeScript, lint et la compilation Next.js. Vérifier sur un développement enregistré : ajout, téléchargement avec nom correct, persistance après actualisation, retrait et restauration. Le stockage doit rester privé et l’API de téléchargement doit refuser les requêtes anonymes.
