# Langues de l’interface

Dans **Paramètres → Langue**, sélectionner **Français / French** ou **English / Anglais**. Le choix s’applique immédiatement, sans remonter les formulaires ni vider les saisies. Il est mémorisé pour ce navigateur, partagé entre ses onglets et repris au prochain chargement (cookie valable un an). Ce n’est pas encore une préférence de profil synchronisée entre appareils.

## Architecture

- `src/i18n/LanguageProvider.tsx` fournit la langue et `useT()` aux composants. Aucun remplacement de texte dans le DOM ni service de traduction externe.
- `src/i18n/translate.ts` effectue la recherche exacte et l’interpolation nommée. Les libellés inconnus restent affichés tels quels. Les paramètres sont rendus comme texte par React, sans injection HTML.
- `src/i18n/messages.json` contient les catalogues français et anglais. Les deux langues sources historiques sont acceptées pour faciliter la transition de l’interface auparavant mixte.
- Le layout serveur valide le cookie, initialise la même langue et renseigne `html.lang`, évitant un changement de langue au chargement.
- Aucun changement de schéma Supabase n’est nécessaire. Aucun titre de client/story/développement, nom de fichier, script, filtre encodé, identifiant, clé de configuration ou valeur de choix enregistrée n’est traduit.
- Les listes d’options contenant des noms de clients ou stories sont conservées telles quelles. Les choix appartenant au schéma ServiceNow sont traduits séparément de leur valeur technique.

## Vérification ServiceNow via SN Utils

Instance `dev389937`, consultation en lecture seule le 20 octobre 2026 :

- `sys_documentation` : libellés des champs, avec `name`, `element`, `language`, `label`.
- `sys_choice` : libellés des choix, dont la valeur technique doit rester stable.
- `sys_translated` : valeurs traduites de certains champs.
- `sys_translated_text` : contenus traduits liés à un document, une table et un champ ; ce n’est pas la source générale des libellés de formulaires.

La requête française sur les 36 tables d’artefacts du schéma et `sys_metadata` n’a retourné aucun libellé. La requête française de choix sur `sys_script` et celle de `sys_translated` étaient également vides. Des traductions existent ailleurs dans l’instance, mais pas pour ce périmètre. Les traductions françaises livrées sont donc un catalogue rédigé pour l’app, pas un export officiel du pack français ServiceNow. Les protocoles, mots-clés techniques, noms de méthodes et nombres restent identiques.

Tous les libellés et choix du snapshot local `serviceNowSchema.json` ont une entrée dans les deux catalogues. Un nouveau type ou champ ajouté au snapshot devra enrichir ces catalogues ; le test de couverture le signale.

## Validation

`npm run test:language` vérifie les libellés, les choix, le repli, l’interpolation et la validation des langues. Vérification navigateur : changement immédiat, conservation des saisies et du type de développement, libellés Catalog Item en français/anglais, cookie après rechargement, navigation mobile, absence d’erreurs JavaScript. Aucun enregistrement métier n’est créé par ces contrôles.
