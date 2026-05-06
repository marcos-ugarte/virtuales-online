import asyncio
from scrapling.fetchers import StealthyFetcher

def test_golden_race():
    print("Iniciando Scrapling para virtual-games.virtustec.com...")
    
    # 1. Cargamos la página principal
    page = StealthyFetcher.fetch('https://virtual-games.virtustec.com/demo/desktop/', headless=True, network_idle=True)
    
    # Extraer iframes
    iframes = page.css('iframe')
    if not iframes:
        print("No se encontraron iframes.")
        return
        
    iframe_src = iframes[0].attrib.get('src')
    print(f"\n[+] Se encontró el iframe principal del juego:\n{iframe_src}")
    
    # 2. El juego real está dentro de ese iframe. Vamos a cargarlo directamente.
    print("\n[+] Cargando la URL del iframe (donde está el juego real)...")
    game_page = StealthyFetcher.fetch(iframe_src, headless=True, network_idle=True)
    
    # Mostrar algo de info del juego real
    print(f"[+] Título interno: {game_page.css('title::text').get()}")
    
    # Mostrar los contenedores principales
    divs = game_page.css('div')
    print(f"[+] Total de <div> en el juego: {len(divs)}")
    
    # Extraer todo el HTML (buscando el nodo html)
    html_content = game_page.css('html')[0].get() if game_page.css('html') else ""
    
    with open('renderizado.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    print("\n[!] Se ha guardado el HTML real del juego en 'renderizado.html'.")

if __name__ == "__main__":
    test_golden_race()
