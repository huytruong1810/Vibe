/** Separate development entry: never creates a simulation worker or Ollama client. */
const root = document.getElementById('app')!;
if (import.meta.env.DEV) {
  void import('./presentation/gallery')
    .then(({ initializeArtGallery }) => initializeArtGallery(root))
    .catch((error) => {
      root.textContent = `Art gallery unavailable: ${String(error)}`;
    });
} else root.textContent = 'The art review gallery is available in development builds.';
