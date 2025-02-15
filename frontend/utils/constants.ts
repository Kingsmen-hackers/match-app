import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { PublicKey } from "@solana/web3.js";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { CoinPayment } from "@/types";

export const chainName = "Sepolia";
const env = useRuntimeConfig().public;

const chains: {
  [key: number]: {
    name: string;
    chainId: number;
    blockExplorer: string;
  };
} = {
  11155111: {
    name: "Sepolia",
    chainId: 11155111,
    blockExplorer: "https://sepolia.etherscan.io",
  },
  80002: {
    name: "Amoy",
    chainId: 80002,
    blockExplorer: "https://amoy.polygonscan.com/",
  },
  97: {
    name: "BSC Testnet",
    chainId: 97,
    blockExplorer: "https://testnet.bscscan.com",
  },
  1337: {
    name: "BSC Testnet",
    chainId: 1337,
    blockExplorer: "https://testnet.bscscan.com",
  },
};

export const chainInfo = chains[+env.chainId];

export const LOCATION_DECIMALS = 18;
export const PROJECT_ID = "73801621aec60dfaa2197c7640c15858";
export const DEBUG = true;
export const appMetaData = {
  name: "Finder",
  description:
    "Finder is a blockchain application that allows buyers to find the best deals on products they want to buy.",
  icons: [window.location.origin + "/favicon.ico"],
  url: window.location.origin,
};

export const USER_TAG = "USER_STATE";

export const LOCATION_PREFERENCE_TAG = "LOCATION_PREFERENCE_STATE";

export const ADMIN_TAG = "ADMIN_TAG";

export const STORE_TAG = "STORE_STATE";

export const REQUEST_TAG = "REQUEST_STATE";

export const OFFER_TAG = "OFFER_STATE";

export const REQUEST_PAYMENT_TAG = "REQUEST_PAYMENT_STATE";

export const USER_COUNTER = "USER_COUNTER";

export const STORE_COUNTER = "STORE_COUNTER";

export const REQUEST_COUNTER = "REQUEST_COUNTER";

export const OFFER_COUNTER = "OFFER_COUNTER";

export const REQUEST_PAYMENT_COUNTER = "REQUEST_PAYMENT_COUNTER";

export const PAYMENT_COIN = "SOL";

export const programID = new PublicKey(env.contractId);
export const USER_COUNTER_PUBKEY = findProgramAddressSync(
  [utf8.encode(USER_COUNTER)],
  programID
)[0];

export const STORE_COUNTER_PUBKEY = findProgramAddressSync(
  [utf8.encode(STORE_COUNTER)],
  programID
)[0];

export const REQUEST_COUNTER_PUBKEY = findProgramAddressSync(
  [utf8.encode(REQUEST_COUNTER)],
  programID
)[0];

export const OFFER_COUNTER_PUBKEY = findProgramAddressSync(
  [utf8.encode(OFFER_COUNTER)],
  programID
)[0];

export const REQUEST_PAYMENT_COUNTER_PUBKEY = findProgramAddressSync(
  [utf8.encode(REQUEST_PAYMENT_COUNTER)],
  programID
)[0];

export const PORTAL_CLIENT_PUBKEY = new PublicKey(
  "GDCRomxxHbEmBXcWL2WACAqzJ46jMzM8kCsWBhg2Kmjt"
);

export const PYTH_USDC_PRICE_FEED_PUBKEY = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

export const PYUSD_ADDR = new PublicKey(env.pyUsdMint);

export const SERVER_URL = env.serverUrl;

export const PORTAL_PYUSD_TOKEN_ACCOUNT = getAssociatedTokenAddressSync(
  PYUSD_ADDR,
  PORTAL_CLIENT_PUBKEY,
  true,
  TOKEN_2022_PROGRAM_ID
);

export const tokens: {
  name: string;
  symbol: string;
  network?: string;
  logo: string;
}[] = [
  {
    name: "Solana",
    symbol: CoinPayment.SOLANA,
    logo: "https://www.svgrepo.com/show/470684/solana.svg",
  },
  {
    name: "Paypal USD",
    symbol: CoinPayment.PyUSDT,
    network: "solana",
    logo: "https://svgicons.com/api/ogimage/?id=213765&n=pyusd",
  },
];
