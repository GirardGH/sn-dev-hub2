# Connexion Google et préparation du déploiement

État au 20 octobre 2026 : le client OAuth Google **SN Dev Hub — Web** est créé dans le projet `sn-dev-hub` (numéro `39668493453`). Le fournisseur Google est activé sur Supabase et le bouton est activé dans la configuration locale. Le propriétaire a confirmé la réussite d’une connexion Google réelle. Le secret OAuth est configuré directement dans Supabase et n’est pas stocké dans le dépôt. Chaque nouvel environnement doit définir `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` et disposer de ses URL de redirection autorisées. La publication Google et le branding de production restent à finaliser avec le domaine public.

## Choix d’architecture

Conserver Supabase Auth et ajouter son fournisseur Google OAuth/OIDC. Les sessions, les IDs des comptes et les droits des espaces continuent à utiliser Supabase. Aucun Auth0 supplémentaire n’est nécessaire pour ce besoin. Chaque consultant utilise son compte individuel ; la connexion Google ne donne pas automatiquement accès à une société.

« Continuer avec Google » accepte les comptes Google personnels et, selon les politiques de leur organisation, Google Workspace. Un SSO d’entreprise administré par société (SAML, Google Workspace/Entra) est une fonctionnalité distincte. Supabase propose SAML sur les plans Pro et supérieurs. Cette première implémentation est la connexion Google OAuth, pas le SAML par société.

## 1. Créer le projet Google Cloud

Le propriétaire actuel de l’application peut démarrer avec son compte Google personnel. Si l’entreprise devient responsable de l’outil, prévoir sa gouvernance et ses administrateurs dans l’organisation de l’entreprise.

1. Ouvrir https://console.cloud.google.com/ avec le compte choisi.
2. Créer un projet **SN Dev Hub**, puis le sélectionner.
3. Ouvrir **Google Auth Platform**, puis configurer le nom de l’application, l’adresse de support et le contact développeur.
4. Pour un projet personnel, choisir une audience **External / Externe**. En mode test, ajouter explicitement les comptes de test dans **Audience**. La configuration **Internal** concerne une organisation Google Workspace.
5. Dans **Data Access**, n’autoriser que les informations de base : `openid`, email et profil. Aucun accès Gmail ou Drive n’est nécessaire.
6. Dans **Clients**, créer un client OAuth de type **Web application / Application Web**. La création et la saisie des identifiants sont réalisées par le propriétaire, directement dans les consoles.

Origine JavaScript pour le test local :

```text
http://localhost:3000
```

URI de redirection autorisé côté Google, pour le projet Supabase hébergé utilisé par cette application :

```text
https://tqsklgcymeobrkwpdatt.supabase.co/auth/v1/callback
```

Cette URI Google est celle de Supabase, même quand l’application tourne sur le Mac. Ne pas la confondre avec `/auth/callback` de l’app.

## 2. Configurer Supabase

Dans le projet **sn-dev-hub3** : **Authentication → Sign In / Providers → Google**. Renseigner le Client ID et le Client Secret directement dans cette console, puis activer Google. Ne pas mettre le secret Google dans le chat, GitHub ou une variable `NEXT_PUBLIC_*`.

Dans **Authentication → URL Configuration**, autoriser exactement :

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/reset-password
```

Conserver les URL déjà utilisées par les autres flux si elles sont nécessaires. La **Site URL** doit être l’adresse de l’app ; en production, la remplacer par le domaine HTTPS retenu et ajouter ses URL de retour précises. Éviter les jokers globaux en production.

## 3. Afficher le bouton et tester

Après activation du fournisseur :

```dotenv
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

Ajouter cette variable dans `.env.local`, puis redémarrer le serveur de développement. En production, la définir dans la configuration de l’hébergement et reconstruire l’app. Elle est publique et ne contient aucun secret.

Le bouton apparaît sur connexion et inscription. Le retour utilise PKCE, crée la session Supabase puis mène au tableau de bord. Une annulation/erreur affiche un message générique. La connexion par email/mot de passe reste disponible. La récupération de mot de passe conserve sa destination dédiée.

Tests réels à réaliser avec le propriétaire :

- Premier accès avec un compte de test : un espace personnel est créé, aucun accès société automatique.
- Compte déjà existant avec le même email vérifié : contrôler que l’ID et les données sont conservés. Supabase prend en charge la liaison automatique d’identités ; une autre adresse email constitue normalement un autre compte.
- Déconnexion/reconnexion, annulation Google et récupération de mot de passe.
- Deux consultants : lecteur/contributeur, accès inter-espaces refusé et copie de fichier privée en conditions réelles.

Aucune liaison manuelle de comptes et aucune modification des appartenances aux sociétés n’ont été ajoutées par cette fonctionnalité.

## Avant un déploiement public

1. **Dépendances** : l’audit npm effectué sur le projet actuel signale 18 alertes (4 modérées, 13 élevées, 1 critique), dont Next.js en critique. Certaines résolutions proposées nécessitent une mise à niveau majeure. Préparer cette mise à niveau et ses tests avant publication ; aucun `audit fix --force` automatique.
2. **Hébergement et domaine** : choisir l’hébergeur Next.js (Vercel est une possibilité), définir les variables Supabase et les URL d’authentification exactes. L’application utilise des fonctions serveur et ne se déploie pas comme un simple export statique.
3. **Emails** : configurer un SMTP de production pour les confirmations et la récupération des comptes si ces flux sont conservés.
4. **Exploitation** : définir sauvegardes/restauration pour la base et les fichiers, suivi des erreurs et besoins de quota/disponibilité. Choisir l’offre Supabase en fonction de ces besoins ; la connexion Google seule ne signifie pas que SAML est requis.
5. **Validation** : tester une vraie copie Storage entre espaces et les droits avec plusieurs comptes. Les tests PostgreSQL isolés ne remplacent pas ce transfert réseau.
6. **Livraison** : versionner ensemble les changements fonctionnels et leur configuration d’exemple ; valider une préproduction avant l’ouverture aux consultants.

## Validation du code

- `node scripts/test-google-auth.cjs` : destinations autorisées, retour OAuth et récupération, annulation/échecs, callback accessible avec une session existante, pages privées protégées.
- Tests de langue, TypeScript, lint et compilation de production réussis avec le bouton Google activé dans la copie de test.
- Vérification navigateur isolée : boutons connexion/inscription, maintien du mot de passe, annulation traduite, mobile, requête OAuth interceptée avec PKCE et scopes minimaux. Aucun véritable accès Google accordé lors de ce test.

## Documentation officielle

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://nextjs.org/docs/app/getting-started/deploying
