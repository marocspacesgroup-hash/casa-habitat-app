# Photos des biens

Pour chaque bien, créez un dossier nommé avec sa référence exacte :

```
public/images/biens/CH-0001/01.webp
public/images/biens/CH-0001/02.webp
public/images/biens/CH-0001/03.webp
```

- `01` = image principale (utilisée sur les cartes et en tête de fiche).
- Format recommandé : `.webp` (léger, bonne qualité). `.jpg` fonctionne aussi.
- Dimensions conseillées : au moins 1600×1200 px pour l'image principale.

Une fois les fichiers déposés, mettez à jour l'entrée correspondante dans
`src/data/listings.ts` en remplaçant `placeholderImage()` par
`photoImage(reference, index, "texte alternatif", largeur, hauteur)` —
voir `src/lib/images.ts`.
