from scrapling.fetchers import Fetcher, StealthyFetcher

def run_basic_demo():
    print("=== Demo 1: Petición HTTP rápida ===")
    print("Extrayendo datos de quotes.toscrape.com...")
    # Realiza una petición HTTP simple y muy rápida
    page = Fetcher.get('https://quotes.toscrape.com/')
    
    # Busca elementos usando selectores CSS
    quotes = page.css('.quote')
    print(f"¡Se encontraron {len(quotes)} frases!\n")
    
    # Muestra las primeras 3 frases
    for quote in quotes[:3]:
        text = quote.css('.text::text').get()
        author = quote.css('.author::text').get()
        print(f"- {text}\n  Autor: {author}\n")

def run_stealth_demo():
    print("\n=== Demo 2: Modo Navegador Sigiloso (Bypass anti-bots) ===")
    print("Abriendo navegador oculto... (esto puede tardar unos segundos la primera vez)")
    # Este modo utiliza un navegador real para evadir bloqueos, Cloudflare, etc.
    # network_idle=True espera a que la red se estabilice (útil en sitios dinámicos)
    page = StealthyFetcher.fetch('https://quotes.toscrape.com/', headless=True, network_idle=True)
    
    quotes = page.css('.quote')
    print(f"Frases encontradas mediante navegador real: {len(quotes)}\n")

if __name__ == "__main__":
    run_basic_demo()
    
    # Nota: StealthyFetcher descargará el navegador en su primer uso si no está presente.
    run_stealth_demo()
    
    print("¡Demo de Scrapling finalizada con éxito!")
