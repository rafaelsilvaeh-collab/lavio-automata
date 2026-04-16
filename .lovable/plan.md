

# Substituir galeria de screenshots por vídeo do YouTube

## Alteração

### `src/pages/Landing.tsx` — seção "Screenshots"
- Remover o grid de 4 cards com imagens
- Substituir por um embed do YouTube centralizado com o vídeo `https://youtu.be/hSEnMfKVBF8`
- Usar iframe responsivo com `aspect-video` dentro de um card com bordas arredondadas e sombra
- Manter o título "Veja o Lavgo em ação" e o subtexto
- ID do vídeo: `hSEnMfKVBF8`

### Estrutura do embed
```html
<div class="max-w-3xl mx-auto">
  <Card>
    <div class="aspect-video">
      <iframe src="https://www.youtube.com/embed/hSEnMfKVBF8" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen class="w-full h-full rounded-xl" />
    </div>
  </Card>
</div>
```

## Arquivo alterado
- `src/pages/Landing.tsx` — substituir grid de screenshots por iframe do YouTube

