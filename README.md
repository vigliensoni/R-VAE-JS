# R-VAE-JS
## RELS: Rhythmic explorations of latent spaces

This web-based device enables the easy exploration of a latent space learned from a dataset of rhythms using a VAE.

Based on [Nao Tokui's RhythmVAE](https://github.com/naotokui/RhythmVAE_M4L)

Currently only working on Firefox.

Play with R-VAE on the browser: https://vigliensoni.github.io/R-VAE-JS/


### Installation:

To install packages:
``` bash
npm install
```

To create distribution

``` bash
npm run build
```

After webpack is executed all the required components will be packaged and ready to be used in the `dist` folder.

The demo running on Github is served from the `docs` folder, and so the contents from `dist` have to be copied over.
