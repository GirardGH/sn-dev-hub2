# Filtres au clic droit dans les listes

Les cellules des listes principales (clients, stories, développements, imports XML) et des related lists proposent Show Matching / Filter Out, traduits en français. Le menu est aussi accessible par Maj+F10 ou la touche de menu contextuel sur une cellule focalisée ; flèches, Entrée et Échap permettent de le piloter. Le clic droit n’ouvre pas la fiche.

Les filtres contextuels se combinent par ET, avec la recherche et les filtres existants. Les pastilles affichent champ, opérateur et valeur lisible ; chacune peut être retirée et une commande efface tous les filtres contextuels. Le comparateur est insensible à la casse et respecte les valeurs vides, zéro et faux. Les références client/story sont comparées par identifiant lorsqu’il existe, même si leurs libellés sont identiques. Les valeurs composées non primitives ne déclenchent pas de filtre.

Les compteurs, sélections pour actions et exports suivent les résultats visibles. Le filtrage est local aux enregistrements déjà chargés ; ce n’est pas une pagination ou recherche côté serveur et les filtres ne sont pas persistés après démontage de la liste. Aucune mutation de données, de permissions ou du parseur XML.

Validation : typage, lint ciblé, tests du comparateur et traductions, compilation de production. Recette navigateur sur les listes clients et la related list de 710 développements : clic droit, clavier, Show Matching, Filter Out, effacement et absence de navigation. Le type sys_decision_question conserve 50 lignes en correspondance et 660 lignes en exclusion.
