# Vues d’archive : Decision Tables et Mobile

Installées sur les fiches de story, au-dessus de la liste technique existante. Consultation uniquement : aucun changement du parseur, du processus d’import, des données Supabase ni de ServiceNow.

## Decision Tables

Regroupement par sys_id et références decision_table / model_id. Colonnes issues des définitions archivées des entrées et résultats. Les conditions d’égalité simples sont décomposées en colonnes ; les conditions complexes restent affichées à l’identique dans Détails. Une condition répétant le même champ n’est pas simplifiée. Les résultats dynamiques sont lus dans les variables XML lorsqu’elles sont disponibles ; à défaut, les valeurs issues du libellé archivé sont marquées d’un astérisque. Elles ne sont pas présentées comme des champs bruts.

Les variantes ne sont ni fusionnées ni effacées. Sur la story examinée : deux tables, 15 lignes Required Attachments et 35 Applicant organisations. La version actuellement publiée dans ServiceNow comporte 13 règles Required Attachments : l’archive conserve aussi un résultat par défaut et des variantes. Un avertissement signale les conditions répétées sans conclure qu’il s’agit de doublons à supprimer.

## Mobile

Explorateur des composants sys_sg_* : arborescence, propriétés archivées, liens vers les fiches techniques et aperçu structurel. Relations orientées : form → segment → embedded_screen → screen_field ; écran → carte → éléments → attributs. Les composants partagés peuvent apparaître dans plusieurs branches ; les cycles et la profondeur sont bornés. Les références ne sont jamais reconstituées depuis le seul nom. Les composants non atteints depuis les écrans principaux restent accessibles dans Autres composants / parents absents.

Sur la story examinée : 172 composants mobiles. Les écrans homonymes My Ticket sont distingués par leur description Administrative Request et After Sales Asset Supply Request. L’aperçu représente la structure archivée ; il n’exécute ni scripts, ni règles UI, ni requêtes de données métier, et ne reproduit pas au pixel près le rendu natif mobile. Aucune dépendance n’est automatiquement récupérée de l’instance client.

## Résolution et limites

Les références sont résolues dans la story accessible déjà chargée. L’import source est privilégié pour distinguer les versions ; une référence restant ambiguë n’est pas résolue. Un parent absent d’une autre story ou de l’export est signalé. Le mécanisme ne contourne pas les règles d’accès existantes. La limite historique de chargement des grandes listes reste un chantier séparé.

Interface français/anglais. Le contenu des développements conserve sa langue d’origine.

## Validation

Tests des identifiants, noms identiques, versions ambiguës, résultats contenant des virgules, conditions complexes, relations mobiles, références absentes et non-mutation des données sources. Suites existantes dont import XML réussies ; typage, lint ciblé et compilation de production réussis. Recette navigateur : grilles des deux tables, recherche theft, distinction des deux écrans et navigation Administrative Request → Details / Updates. L’instance client a uniquement été consultée.
