import { defineStore } from "pinia";
import {
  CoinDecimals,
  CoinPayment,
  CreateOfferDTO,
  CreateRequestDTO,
  Offer,
  RequestLifecycleIndex,
  RequestResponse,
} from "@/types";
import { useUserStore } from "./user";
import {
  OFFER_COUNTER_PUBKEY,
  OFFER_TAG,
  PORTAL_CLIENT_PUBKEY,
  PORTAL_PYUSD_TOKEN_ACCOUNT,
  PYTH_USDC_PRICE_FEED_PUBKEY,
  PYUSD_ADDR,
  REQUEST_COUNTER_PUBKEY,
  REQUEST_TAG,
  USER_TAG,
} from "@/utils/constants";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { useWallet } from "solana-wallets-vue";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { ntobs58 } from "@/utils/nb58";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { programID } from "@/utils/constants";
const { publicKey, wallet } = useWallet();

const env = useRuntimeConfig().public;
type RequestsStoreType = {
  list: RequestResponse[];
};
export const useRequestsStore = defineStore("requests", {
  state: (): RequestsStoreType => ({
    list: [],
  }),
  getters: {
    hasLocked() {
      return ({ updatedAt, period }: { updatedAt: Date; period: number }) => {
        const updatedAtTime = updatedAt.getTime();
        const currentTime = Date.now();

        return currentTime >= updatedAtTime + period;
      };
    },
  },
  actions: {
    async createRequest({
      name,
      description,
      images,
      latitude,
      longitude,
    }: CreateRequestDTO): Promise<any | undefined> {
      const userStore = useUserStore();

      try {
        const contract = await userStore.getContract();

        const [profilePda, _] = findProgramAddressSync(
          [utf8.encode(USER_TAG), publicKey.value!.toBuffer()],
          programID
        );

        const requestCounter = await contract.account.counter.fetch(
          REQUEST_COUNTER_PUBKEY
        );

        const [requestPda] = findProgramAddressSync(
          [
            utf8.encode(REQUEST_TAG),
            publicKey.value!.toBuffer(),
            Buffer.from(requestCounter.current.toArray("le", 8)),
          ],
          programID
        );

        const receipt = await contract.methods
          .createRequest(
            name,
            description,
            [...images],
            new BN(Math.trunc(latitude).toString()),
            new BN(Math.trunc(longitude).toString())
          )
          .accounts({
            user: profilePda,
            systemProgram: SystemProgram.programId,
            requestCounter: REQUEST_COUNTER_PUBKEY,
            authority: publicKey.value!,
            request: requestPda,
          })
          .rpc();
        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async fetchAllUserRequests(accountId: string) {
      try {
        const userStore = useUserStore();
        const contract = await userStore.getContract();

        const userRequests = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 0,
              bytes: accountId,
            },
          },
        ]);

        const res: any = userRequests.map((request) => {
          const lifecycle_ = Object.keys(
            request.account.lifecycle
          )[0].toUpperCase();

          let lifecycle: RequestLifecycleIndex = RequestLifecycleIndex.PENDING;

          Object.entries(RequestLifecycleIndex).forEach(([key, value]) => {
            if (key.replaceAll("_", "") === lifecycle_) {
              lifecycle = value as RequestLifecycleIndex;
            }
          });

          return {
            requestId: Number(request.account.id),
            requestName: request.account.name,
            buyerId: Number(request.account.buyerId),
            sellersPriceQuote: Number(request.account.sellersPriceQuote),
            lockedSellerId: Number(request.account.lockedSellerId),
            description: request.account.description,
            lifecycle,
            longitude: Number(request.account.location.longitude.toString()),
            latitude: Number(request.account.location.latitude.toString()),
            createdAt: Number(request.account.createdAt.toString()),
            updatedAt: Number(request.account.updatedAt.toString()),
            images: request.account.images,
          };
        });

        this.list = res;
        return res;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
    async fetchAllSellersRequests(accountId: string) {
      const env = useRuntimeConfig().public;
      const userStore = useUserStore();
      try {
        const contract = await userStore.getContract();
        const offerMade = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 0,
              bytes: accountId,
            },
          },
        ]);

        const requests = [];

        for (let i = 0; i < offerMade.length; i++) {
          const offer = offerMade[i];
          const requestMade = await contract.account.request.all([
            {
              memcmp: {
                offset: 8 + 32,
                bytes: ntobs58(offer.account.requestId),
              },
            },
          ]);

          const request = requestMade[0];

          const lifecycle_ = Object.keys(
            request.account.lifecycle
          )[0].toUpperCase();

          let lifecycle: RequestLifecycleIndex = RequestLifecycleIndex.PENDING;

          Object.entries(RequestLifecycleIndex).forEach(([key, value]) => {
            if (key.replaceAll("_", "") === lifecycle_) {
              lifecycle = value as RequestLifecycleIndex;
            }
          });

          requests.push({
            requestId: Number(request.account.id),
            requestName: request.account.name,
            buyerId: Number(request.account.buyerId),
            sellersPriceQuote: Number(request.account.sellersPriceQuote),
            lockedSellerId: Number(request.account.lockedSellerId),
            description: request.account.description,
            lifecycle,
            longitude: Number(request.account.location.longitude.toString()),
            latitude: Number(request.account.location.latitude.toString()),
            createdAt: Number(request.account.createdAt.toString()),
            updatedAt: Number(request.account.updatedAt.toString()),
            images: request.account.images,
          });
        }

        this.list = requests;
        return requests;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
    async getRequest(requestId: number) {
      const userStore = useUserStore();

      try {
        const contract = await userStore.getContract();

        const requests = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const request_ = requests[0];

        const lifecycle_ = Object.keys(
          request_.account.lifecycle
        )[0].toUpperCase();

        let lifecycle: RequestLifecycleIndex = RequestLifecycleIndex.PENDING;

        Object.entries(RequestLifecycleIndex).forEach(([key, value]) => {
          if (key.replaceAll("_", "") === lifecycle_) {
            lifecycle = value as RequestLifecycleIndex;
          }
        });

        const request: RequestResponse = {
          requestId: Number(request_.account.id),
          requestName: request_.account.name,
          buyerId: Number(request_.account.buyerId),
          sellersPriceQuote: Number(request_.account.sellersPriceQuote),
          lockedSellerId: Number(request_.account.lockedSellerId),
          description: request_.account.description,
          lifecycle,
          longitude: Number(request_.account.location.longitude.toString()),
          latitude: Number(request_.account.location.latitude.toString()),
          createdAt: Number(request_.account.createdAt.toString()),
          updatedAt: Number(request_.account.updatedAt.toString()),
          images: request_.account.images,
        };

        return request;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getTransactionHistory(): Promise<any> {
      const userStore = useUserStore();
      try {
        const contract = await userStore.getContract();

        const transactions =
          await contract.account.requestPaymentTransaction.all([
            {
              memcmp: {
                offset: 8,
                bytes: publicKey.value!.toBase58(),
              },
            },
          ]);

        const res = transactions.map((transaction) => {
          const tokenInfo = Object.keys(transaction.account.token)[0];

          return {
            createdAt: new Date(Number(transaction.account.createdAt * 1000)),
            amount:
              Number(transaction.account.amount) /
              10 ** CoinDecimals[tokenInfo as CoinPayment],
            token: Object.keys(transaction.account.token)[0],
            requestId: Number(transaction.account.requestId),
            sellerId: Number(transaction.account.sellerId),
            buyerId: Number(transaction.account.buyerId),
          };
        });

        return res;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
    async getRequestImages(request_id: number): Promise<string[] | undefined> {
      const userStore = useUserStore();

      const contract = await userStore.getContract();
      // const length = await contract.getRequestImagesLength(request_id);

      // const images = [];
      // for (let i = 0; i < length; i++) {
      //   const image = await contract.getRequestImageByIndex(request_id, i);
      //   images.push(image);
      // }
      return [];
    },

    // SELLERS
    async fetchNearbyRequestsForSellers({
      lat,
      long,
    }: {
      lat: number;
      long: number;
    }) {
      const env = useRuntimeConfig().public;
      const userStore = useUserStore();
      try {
        const contract = await userStore.getContract();

        const allRequests = await contract.account.request.all([]);

        const res: any = allRequests
          .map((request) => {
            const lifecycle_ = Object.keys(
              request.account.lifecycle
            )[0].toUpperCase();

            let lifecycle: RequestLifecycleIndex =
              RequestLifecycleIndex.PENDING;

            Object.entries(RequestLifecycleIndex).forEach(([key, value]) => {
              if (key.replaceAll("_", "") === lifecycle_) {
                lifecycle = value as RequestLifecycleIndex;
              }
            });

            return {
              requestId: Number(request.account.id),
              requestName: request.account.name,
              buyerId: Number(request.account.buyerId),
              sellersPriceQuote: Number(request.account.sellersPriceQuote),
              lockedSellerId: Number(request.account.lockedSellerId),
              description: request.account.description,
              lifecycle,
              longitude: Number(request.account.location.longitude.toString()),
              latitude: Number(request.account.location.latitude.toString()),
              createdAt: Number(request.account.createdAt.toString()),
              updatedAt: Number(request.account.updatedAt.toString()),
              images: request.account.images,
            };
          })
          .filter((request) => {
            if (
              request.lifecycle === RequestLifecycleIndex.PENDING ||
              request.lifecycle === RequestLifecycleIndex.ACCEPTED_BY_SELLER
            ) {
              return request;
            }
            return false;
          });

        this.list = res;
        return res;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
    async createOffer({
      price,
      images,
      requestId,
      storeName,
    }: CreateOfferDTO): Promise<any | undefined> {
      const userStore = useUserStore();
      const env = useRuntimeConfig().public;

      try {
        const contract = await userStore.getContract();
        const [profilePda, _] = findProgramAddressSync(
          [utf8.encode(USER_TAG), publicKey.value!.toBuffer()],
          programID
        );

        const offerCounter = await contract.account.counter.fetch(
          OFFER_COUNTER_PUBKEY
        );

        const requestMade = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const request = requestMade[0];

        const [offerPda] = findProgramAddressSync(
          [
            utf8.encode(OFFER_TAG),
            publicKey.value!.toBuffer(),
            Buffer.from(offerCounter.current.toArray("le", 8)),
          ],
          programID
        );

        const receipt = await contract.methods
          .createOffer(
            new BN(Math.trunc(price).toString()),
            [...images],
            storeName
          )
          .accounts({
            user: profilePda,
            systemProgram: SystemProgram.programId,
            offerCounter: OFFER_COUNTER_PUBKEY,
            authority: publicKey.value!,
            request: request.publicKey,
            offer: offerPda,
          })
          .rpc();

        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async acceptOffer(offerId: number): Promise<any | undefined> {
      const userStore = useUserStore();
      try {
        const [profilePda, _] = findProgramAddressSync(
          [utf8.encode(USER_TAG), publicKey.value!.toBuffer()],
          programID
        );
        const contract = await userStore.getContract();

        const offerMade = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(offerId),
            },
          },
        ]);

        const offer = offerMade[0];

        const requestMade = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(offer.account.requestId),
            },
          },
        ]);

        const offerAccounts = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 32 + 8,
              bytes: ntobs58(offer.account.requestId),
            },
          },
        ]);

        const request = requestMade[0];

        const receipt = await contract.methods
          .acceptOffer()
          .accounts({
            user: profilePda,
            systemProgram: SystemProgram.programId,
            authority: publicKey.value!,
            offer: offer.publicKey,
            request: request.publicKey,
          })
          .remainingAccounts(
            offerAccounts.map((offerAccount) => ({
              pubkey: offerAccount.publicKey,
              isWritable: true,
              isSigner: false,
            }))
          )
          .rpc();
        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async fetchAllOffers(requestId: number) {
      const env = useRuntimeConfig().public;

      const userStore = useUserStore();

      try {
        const contract = await userStore.getContract();

        const offers = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 32 + 8,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const res: any = offers.map((offer) => {
          const offer_: Offer = {
            id: Number(offer.account.id),
            offerId: Number(offer.account.id),
            price: Number(offer.account.price),
            images: offer.account.images,
            requestId: offer.account.requestId,
            storeName: offer.account.storeName,
            sellerId: offer.account.sellerId,
            isAccepted: offer.account.isAccepted,
            createdAt: new Date(Number(offer.account.createdAt)),
            updatedAt: new Date(Number(offer.account.updatedAt)),
          };

          return offer_;
        });

        return res;
      } catch (error) {
        console.log({ error });
        throw error;
      }
    },
    async markRequestAsCompleted(requestId: number) {
      const userStore = useUserStore();
      try {
        const contract = await userStore.getContract();

        const request = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const receipt = await contract.methods
          .markRequestAsCompleted()
          .accounts({
            systemProgram: SystemProgram.programId,
            authority: publicKey.value!,
            request: request[0].publicKey,
          })
          .rpc();

        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async deleteRequest(requestId: number) {
      const userStore = useUserStore();
      try {
        const contract = await userStore.getContract();
        const request = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const receipt = await contract.methods
          .deleteRequest()
          .accounts({
            systemProgram: SystemProgram.programId,
            authority: publicKey.value!,
            request: request[0].publicKey,
          })
          .rpc();

        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async payForRequest(requestId: number, coin: CoinPayment) {
      const userStore = useUserStore();
      try {
        if (coin !== CoinPayment.SOLANA) {
          throw new Error("use payForRequestToken instead");
        }

        const contract = await userStore.getContract();
        const requestMade = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const request = requestMade[0];

        const offerId = request.account.acceptedOfferId;

        const offerMade = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(offerId),
            },
          },
        ]);

        const offer = offerMade[0];

        const requestPaymentCounter = await contract.account.counter.fetch(
          REQUEST_PAYMENT_COUNTER_PUBKEY
        );

        const [requestInfoPda] = findProgramAddressSync(
          [
            utf8.encode(REQUEST_PAYMENT_TAG),
            publicKey.value!.toBuffer(),
            Buffer.from(requestPaymentCounter.current.toArray("le", 8)),
          ],
          programID
        );

        const receipt = await contract.methods
          .payForRequest({
            [coin]: {},
          })
          .accounts({
            systemProgram: SystemProgram.programId,
            authority: publicKey.value!,
            request: request.publicKey,
            to: PORTAL_CLIENT_PUBKEY,
            offer: offer.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            requestPaymentCounter: REQUEST_PAYMENT_COUNTER_PUBKEY,
            requestPaymentInfo: requestInfoPda,
          })
          .rpc();

        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    async payForRequestToken(requestId: number, coin: CoinPayment) {
      const userStore = useUserStore();
      try {
        if (coin === CoinPayment.SOLANA) {
          throw new Error("use payForRequest instead");
        }
        const contract = await userStore.getContract();
        const requestMade = await contract.account.request.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(requestId),
            },
          },
        ]);

        const request = requestMade[0];

        const offerId = request.account.acceptedOfferId;

        const offerMade = await contract.account.offer.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: ntobs58(offerId),
            },
          },
        ]);

        const offer = offerMade[0];

        const fromAta = getAssociatedTokenAddressSync(
          PYUSD_ADDR,
          publicKey.value!,
          true,
          TOKEN_2022_PROGRAM_ID
        );

        const requestPaymentCounter = await contract.account.counter.fetch(
          REQUEST_PAYMENT_COUNTER_PUBKEY
        );

        const [requestInfoPda] = findProgramAddressSync(
          [
            utf8.encode(REQUEST_PAYMENT_TAG),
            publicKey.value!.toBuffer(),
            Buffer.from(requestPaymentCounter.current.toArray("le", 8)),
          ],
          programID
        );

        console.log({ fromAta, requestInfoPda });

        const receipt = await contract.methods
          .payForRequestToken({
            [coin]: {},
          })
          .accounts({
            systemProgram: SystemProgram.programId,
            authority: publicKey.value!,
            request: request.publicKey,
            offer: offer.publicKey,
            toAta: PORTAL_PYUSD_TOKEN_ACCOUNT,
            fromAta: fromAta,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            priceUpdate: PYTH_USDC_PRICE_FEED_PUBKEY,
            mint: PYUSD_ADDR,
            requestPaymentCounter: REQUEST_PAYMENT_COUNTER_PUBKEY,
            requestPaymentInfo: requestInfoPda,
          })
          .rpc();

        return receipt;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },

    removeDeletedRequestFromList(requestId: number) {
      this.list = this.list.filter(
        (request) => request.requestId !== requestId
      );
    },
  },
});
