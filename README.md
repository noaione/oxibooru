## naoX branch

Forked version by me, this includes the following changes:
- OIDC authentication support: https://github.com/noaione/oxibooru/tree/feature/oidc
- Ugoira support: https://github.com/noaione/oxibooru/tree/feature/ugoira
- JXL upload support: https://github.com/noaione/oxibooru/tree/feature/jxl
- Vue 3 frontend rework: https://github.com/noaione/oxibooru/tree/feat/vue3-frontend
   - OIDC specific changes: https://github.com/noaione/oxibooru/tree/feature/vue3-oidc
   - Ugoira specific changes: https://github.com/noaione/oxibooru/tree/feature/vue3-ugoira
   - JXL specific changes: https://github.com/noaione/oxibooru/tree/feature/vue3-jxl
- Disabled PostgreSQL from opening ports in docker

### OIDC

OIDC is tested personally on Pocket ID, requires PKCE and OpenID Connect discovery.

For callback URL, you should use `https://your-oxibooru-domain.com/oidc/:provider/callback` and set it in your OIDC provider.

### Ugoira

Ugoira is tested with some sample from Pixiv, it requires you to have animation.json embedded in the zip file.

### Future plans

None yet

**Warning**: Most of this are vibe-coded and verified/checked by myself. Initial Vue 3 rework is done by hand but I got lazy after a while so I just ask Claude to continue it.

---

# Oxibooru

Oxibooru is an image board engine based on [Szurubooru](https://github.com/rr-/szurubooru). The backend has been entirely rewritten in Rust with a focus on performance 🚀.

If you're interested in migrating a Szurubooru instance to an Oxibooru one, see the [conversion guide](docs/CONVERSION.md). 

If you're interested in contributing, see the [development guide](docs/DEV.md).

## Features

- Post content: images (JPG, PNG, BMP, GIF, WEBP) and videos (MP4, MOV, WEBM), Flash animations
- Post comments
- Post descriptions
- Post notes / annotations, including arbitrary polygons
- Rich JSON REST API ([see documentation](docs/API.md))
- Token based authentication for clients
- Rich search system
- Rich privilege system
- Autocomplete in search and while editing tags
- Tag categories
- Tag suggestions
- Tag implications (adding a tag automatically adds another)
- Tag aliases
- Pools and pool categories
- Duplicate and similarity detection
- Post rating and favoriting; comment rating
- Polished UI
- Browser configurable endless paging
- Browser configurable backdrop grid for transparent images

## Installation

It is recommended that you use Docker for deployment. See [installation instructions.](docs/INSTALL.md)

## License

[GPLv3](LICENSE.md).
