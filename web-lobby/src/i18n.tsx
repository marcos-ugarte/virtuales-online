/**
 * Tiny i18n: a `lang` (en|es) + a `t(key)` helper + a provider that
 * persists the selection to localStorage so a refresh keeps your choice.
 * Strings are inline below — small enough that an external file would be
 * over-engineering for v1.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'es';

/** Supported wallet currencies. USD = US dollar, DOP = Dominican peso (RD$). */
export type Currency = 'USD' | 'DOP';

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: '$',
  DOP: 'RD$',
};

type Dict = Record<string, string>;

const STRINGS: Record<Lang, Dict> = {
  en: {
    'nav.signout': 'Sign out',
    'nav.balance': 'Balance',
    'nav.user': 'User',
    'lang.label': 'Language',
    'currency.label': 'Currency',

    'mobile.bar.openSlip': 'Open betslip',
    'mobile.bar.selectionOne': 'selection',
    'mobile.bar.selectionMany': 'selections',
    'mobile.bar.win': 'wins',
    'mobile.bar.openCta': 'PLACE',
    'rp.mobile.openMyBets': 'My bets',

    'lobby.upcoming': 'Upcoming Races',
    'lobby.status.connected': 'LIVE',
    'lobby.status.connecting': 'CONNECTING',
    'lobby.status.reconnecting': 'RECONNECTING',
    'lobby.status.error': 'ERROR',

    'card.watch': 'WATCH',
    'card.race': 'Race',
    'card.greyhound': 'Greyhound Racing',
    'card.horse': 'Horse Racing',
    'card.dog6': '6-Greyhound Racing',
    'card.dog8': '8-Greyhound Racing',
    'card.horse7': '7-Horse Racing',
    'card.waiting': 'Waiting for data…',

    'col.lastResults': 'Last Results',
    'col.performance': 'Performance',
    'col.rating': 'Rating',
    'col.rtg': 'RTG',
    'col.win': 'WIN',

    'countdown.startsIn': 'STARTS IN',
    'countdown.liveNow': 'LIVE NOW',

    'monitor.upcoming': 'UPCOMING',
    'monitor.live': 'LIVE',
    'monitor.waiting': 'Waiting for race…',
    'monitor.jackpot': 'JACKPOT',
    'monitor.label.dog': 'Greyhound · 6',
    'monitor.label.dog8': 'Greyhound · 8',
    'monitor.label.horsec': 'Horse · 7',

    'results.title': 'RECENT RESULTS',
    'results.empty': 'No finished races yet.',
    'results.close': 'Close',
    'results.kicker': 'RACE',
    'results.ended': 'ENDED',
    'results.pos': '#',
    'results.runner': 'Runner',
    'results.win': 'Win',
    'results.time': 'Time',
    'results.chip.dog': 'DOG·6',
    'results.chip.dog8': 'DOG·8',
    'results.chip.horsec': 'HORSE',

    'login.title': 'Sign in',
    'login.subtitle': 'Access your Virtual Race account',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.button': 'Sign in',
    'login.buttonLoading': 'Signing in…',
    'login.demoLabel': 'Demo',
    'login.error.invalid_credentials': 'Wrong username or password.',
    'login.error.account_locked': 'Account temporarily locked. Try again later.',
    'login.error.account_suspended': 'Account suspended. Contact support.',
    'login.error.account_closed': 'Account closed.',
    'login.error.self_excluded': 'Account is self-excluded.',
    'login.error.invalid_refresh': 'Session expired. Please sign in again.',
    'login.error.token_replay': 'Session conflict detected. Please sign in again.',
    'login.error.rate_limit': 'Too many attempts. Wait a minute and try again.',
    'login.error.network': 'Connection error. Check your network.',
    'login.error.unknown': 'Unexpected error. Try again.',

    'betslip.title': 'ORDER TICKET',
    'betslip.empty': 'Click on any odd in the WIN column to bet.',
    'betslip.tooltipAdd': 'Click to add to betslip',
    'betslip.tooltipRemove': 'In betslip — click to remove',
    'betslip.win': 'WIN',
    'betslip.odds': 'ODDS',
    'betslip.stake': 'STAKE',
    'betslip.totalStake': 'TOTAL STAKE',
    'betslip.totalPayout': 'POSSIBLE WIN',
    'betslip.place': 'ORDER TICKET',
    'betslip.clear': 'Clear',
    'betslip.clearAll': 'All',
    'betslip.remove': 'Remove',
    'betslip.race': 'RACE',
    'betslip.bets': 'Bets',
    'betslip.multipleRaces': 'Multiple races',
    'betslip.placed': 'Ticket placed.',
    'betslip.placing': 'Placing…',
    'betslip.reject.betting_closed': 'The race already started.',
    'betslip.reject.odds_changed': 'Odds changed. Review your ticket.',
    'betslip.reject.race_not_found': 'Race not found.',
    'betslip.reject.selection_runner_not_in_race': 'Selected runner is not in this race.',
    'betslip.reject.selection_duplicate_runners': 'Duplicate runners in the selection.',
    'betslip.reject.selection_malformed': 'Malformed selection.',
    'betslip.reject.insufficient_funds': 'Insufficient funds.',
    'betslip.reject.stake_below_min': 'Stake below the minimum.',
    'betslip.reject.stake_above_max': 'Stake above the maximum.',
    'betslip.reject.kyc_required': 'Verify your account to bet this amount.',
    'betslip.reject.self_excluded': 'Your account is self-excluded.',
    'betslip.reject.account_suspended': 'Account suspended. Contact support.',
    'betslip.reject.account_closed': 'Account closed.',
    'betslip.reject.unknown': 'Could not place the ticket.',
    'betslip.reject.network': 'Network error. Try again.',
    'betslip.reject.multipleRaces': 'You have selections from more than one race. Remove them or place them as separate tickets.',
    'mybets.title': 'MY BETS',
    'mybets.openTab': 'Active',
    'mybets.settledTab': 'History',
    'mybets.empty.open': 'No active bets.',
    'mybets.empty.settled': 'No bets in history.',
    'mybets.loadMore': 'Load more',
    'mybets.loading': 'Loading…',
    'mybets.error': 'Could not load your bets. Try again.',
    'mybets.retry': 'Retry',
    'mybets.status.won': 'WON',
    'mybets.status.lost': 'LOST',
    'mybets.status.void': 'VOID',
    'mybets.status.partially_settled': 'PARTIAL',
    'mybets.placedAt': 'Placed',
    'mybets.settledAt': 'Settled',
    'mybets.startsIn': 'Starts in',
    'mybets.stake': 'Stake',
    'mybets.payout': 'Payout',
    'mybets.potentialPayout': 'Possible win',
    'mybets.navButton': 'My bets',
    'rp.aria': 'Ticket panel',
    'rp.tabTicket': 'Ticket',

    'footer.copyright': '© 2026 Virtual Race — Virtual Sports Platform',
    'footer.responsible': 'Responsible Gambling',
    'footer.terms': 'Terms & Conditions',
  },
  es: {
    'nav.signout': 'Cerrar sesión',
    'nav.balance': 'Saldo',
    'nav.user': 'Usuario',
    'lang.label': 'Idioma',
    'currency.label': 'Moneda',

    'mobile.bar.openSlip': 'Abrir betslip',
    'mobile.bar.selectionOne': 'selección',
    'mobile.bar.selectionMany': 'selecciones',
    'mobile.bar.win': 'gana',
    'mobile.bar.openCta': 'APOSTAR',
    'rp.mobile.openMyBets': 'Mis apuestas',

    'lobby.upcoming': 'Próximas Carreras',
    'lobby.status.connected': 'EN VIVO',
    'lobby.status.connecting': 'CONECTANDO',
    'lobby.status.reconnecting': 'RECONECTANDO',
    'lobby.status.error': 'ERROR',

    'card.watch': 'VER',
    'card.race': 'Carrera',
    'card.greyhound': 'Carreras de Galgos',
    'card.horse': 'Carreras de Caballos',
    'card.dog6': 'Carreras de 6 Galgos',
    'card.dog8': 'Carreras de 8 Galgos',
    'card.horse7': 'Carreras de 7 Caballos',
    'card.waiting': 'Esperando datos…',

    'col.lastResults': 'Últimos resultados',
    'col.performance': 'Rendimiento',
    'col.rating': 'Valoración',
    'col.rtg': 'VAL',
    'col.win': 'GANA',

    'countdown.startsIn': 'COMIENZA EN',
    'countdown.liveNow': 'EN VIVO',

    'monitor.upcoming': 'PRÓXIMA',
    'monitor.live': 'EN VIVO',
    'monitor.waiting': 'Esperando carrera…',
    'monitor.jackpot': 'JACKPOT',
    'monitor.label.dog': 'Galgos · 6',
    'monitor.label.dog8': 'Galgos · 8',
    'monitor.label.horsec': 'Caballos · 7',

    'results.title': 'ÚLTIMOS RESULTADOS',
    'results.empty': 'Sin carreras finalizadas aún.',
    'results.close': 'Cerrar',
    'results.kicker': 'CARRERA',
    'results.ended': 'FINAL',
    'results.pos': '#',
    'results.runner': 'Corredor',
    'results.win': 'Gana',
    'results.time': 'Tiempo',
    'results.chip.dog': 'GAL·6',
    'results.chip.dog8': 'GAL·8',
    'results.chip.horsec': 'CAB',

    'login.title': 'Iniciar sesión',
    'login.subtitle': 'Accede a tu cuenta de Virtual Race',
    'login.username': 'Usuario',
    'login.password': 'Contraseña',
    'login.button': 'Entrar',
    'login.buttonLoading': 'Entrando…',
    'login.demoLabel': 'Demo',
    'login.error.invalid_credentials': 'Usuario o contraseña incorrectos.',
    'login.error.account_locked': 'Cuenta bloqueada temporalmente. Inténtalo más tarde.',
    'login.error.account_suspended': 'Cuenta suspendida. Contacta con soporte.',
    'login.error.account_closed': 'Cuenta cerrada.',
    'login.error.self_excluded': 'La cuenta está autoexcluida.',
    'login.error.invalid_refresh': 'Sesión expirada. Vuelve a iniciar sesión.',
    'login.error.token_replay': 'Conflicto de sesión detectado. Vuelve a iniciar sesión.',
    'login.error.rate_limit': 'Demasiados intentos. Espera un minuto y vuelve a probar.',
    'login.error.network': 'Error de conexión. Revisa tu red.',
    'login.error.unknown': 'Error inesperado. Inténtalo de nuevo.',

    'betslip.title': 'ORDENAR TICKET',
    'betslip.empty': 'Pincha en cualquier cuota de la columna GANA para apostar.',
    'betslip.tooltipAdd': 'Pincha para añadir al ticket',
    'betslip.tooltipRemove': 'En el ticket — pincha para quitar',
    'betslip.win': 'GANA',
    'betslip.odds': 'CUOTA',
    'betslip.stake': 'APUESTA',
    'betslip.totalStake': 'APUESTA TOTAL',
    'betslip.totalPayout': 'POSIBLE BENEFICIO',
    'betslip.place': 'ORDENAR TICKET',
    'betslip.clear': 'Vaciar',
    'betslip.clearAll': 'Todos',
    'betslip.remove': 'Quitar',
    'betslip.race': 'CARRERA',
    'betslip.bets': 'Apuestas',
    'betslip.multipleRaces': 'Varias carreras',
    'betslip.placed': 'Ticket ordenado.',
    'betslip.placing': 'Ordenando…',
    'betslip.reject.betting_closed': 'La carrera ya empezó.',
    'betslip.reject.odds_changed': 'Las cuotas cambiaron. Revisa el ticket.',
    'betslip.reject.race_not_found': 'Carrera no encontrada.',
    'betslip.reject.selection_runner_not_in_race': 'El corredor seleccionado no está en esta carrera.',
    'betslip.reject.selection_duplicate_runners': 'Corredores duplicados en la selección.',
    'betslip.reject.selection_malformed': 'Selección con formato inválido.',
    'betslip.reject.insufficient_funds': 'Saldo insuficiente.',
    'betslip.reject.stake_below_min': 'Importe por debajo del mínimo.',
    'betslip.reject.stake_above_max': 'Importe por encima del máximo.',
    'betslip.reject.kyc_required': 'Verifica tu cuenta para apostar este importe.',
    'betslip.reject.self_excluded': 'Tu cuenta está autoexcluida.',
    'betslip.reject.account_suspended': 'Cuenta suspendida. Contacta con soporte.',
    'betslip.reject.account_closed': 'Cuenta cerrada.',
    'betslip.reject.unknown': 'No se pudo ordenar el ticket.',
    'betslip.reject.network': 'Error de conexión. Inténtalo de nuevo.',
    'betslip.reject.multipleRaces': 'Tienes selecciones de más de una carrera. Quítalas o ordénalas como tickets separados.',
    'mybets.title': 'MIS APUESTAS',
    'mybets.openTab': 'Activas',
    'mybets.settledTab': 'Historial',
    'mybets.empty.open': 'Sin apuestas activas.',
    'mybets.empty.settled': 'Sin apuestas en el historial.',
    'mybets.loadMore': 'Cargar más',
    'mybets.loading': 'Cargando…',
    'mybets.error': 'No se pudieron cargar tus apuestas. Inténtalo de nuevo.',
    'mybets.retry': 'Reintentar',
    'mybets.status.won': 'GANADA',
    'mybets.status.lost': 'PERDIDA',
    'mybets.status.void': 'ANULADA',
    'mybets.status.partially_settled': 'PARCIAL',
    'mybets.placedAt': 'Ordenada',
    'mybets.settledAt': 'Liquidada',
    'mybets.startsIn': 'Empieza en',
    'mybets.stake': 'Apuesta',
    'mybets.payout': 'Pago',
    'mybets.potentialPayout': 'Posible ganancia',
    'mybets.navButton': 'Mis apuestas',
    'rp.aria': 'Panel del ticket',
    'rp.tabTicket': 'Ticket',

    'footer.copyright': '© 2026 Virtual Race — Plataforma de Deportes Virtuales',
    'footer.responsible': 'Juego Responsable',
    'footer.terms': 'Términos y Condiciones',
  },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format `amount` with the active currency symbol + locale grouping. */
  formatMoney: (amount: number, fractionDigits?: number) => string;
}

const Ctx = createContext<LangCtx | null>(null);

function readStored(): Lang {
  try {
    const v = localStorage.getItem('lang');
    return v === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

function readStoredCurrency(): Currency {
  try {
    const v = localStorage.getItem('currency');
    return v === 'DOP' ? 'DOP' : 'USD';
  } catch {
    return 'USD';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStored());
  const [currency, setCurrencyState] = useState<Currency>(() => readStoredCurrency());

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignore storage errors (private browsing, etc.) */
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('currency', currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  const value = useMemo<LangCtx>(() => {
    const localeTag = lang === 'es' ? 'es-DO' : 'en-US';
    return {
      lang,
      setLang: setLangState,
      currency,
      setCurrency: setCurrencyState,
      t: (key: string) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key,
      formatMoney: (amount: number, fractionDigits = 2) => {
        const num = amount.toLocaleString(localeTag, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        });
        return `${CURRENCY_SYMBOL[currency]} ${num}`;
      },
    };
  }, [lang, currency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang must be used inside <LanguageProvider>');
  return c;
}
