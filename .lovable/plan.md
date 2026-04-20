

# Atualizar vídeo da landing page

## Alteração
Em `src/pages/Landing.tsx`, na seção "Veja o Lavgo em ação", trocar o `src` do `<iframe>`:

- De: `https://www.youtube.com/embed/hSEnMfKVBF8`
- Para: `https://www.youtube.com/embed/LCB0Maw0LH4`

YouTube Shorts não roda direto via URL `/shorts/...` em iframe — é preciso usar o formato `/embed/{ID}`. O ID extraído do link é `LCB0Maw0LH4`.

## Observação sobre formato
O vídeo é um Short (vertical, 9:16), mas o container atual usa `aspect-video` (16:9). Vou manter o `aspect-video` para não quebrar o layout — o vídeo aparecerá centralizado com barras laterais pretas. Se preferir um container vertical (mais alto, sem barras), me avise.

## Arquivo alterado
- `src/pages/Landing.tsx` (apenas o atributo `src` do iframe)

