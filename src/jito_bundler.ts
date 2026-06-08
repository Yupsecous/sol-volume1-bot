import base58 from 'bs58';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const DELAY_PER_REQ = 350
const MAX_REQ_COUNT = 4
const JITO_BUNDLE_TIP = 1000000
const JITO_BUNDLE_LIMIT_SIZE = 5

const connection = new Connection("https://practical-thrilling-market.solana-mainnet.quiknode.pro/2b59477474958a56ed7c415a3730b5e4c20f3126/", "processed");

const JITO_BLOCK_ENGINES = [
	"amsterdam.mainnet.block-engine.jito.wtf",
	"frankfurt.mainnet.block-engine.jito.wtf",
	"ny.mainnet.block-engine.jito.wtf",
	"tokyo.mainnet.block-engine.jito.wtf"
]

const JITO_AUTH_KEYS = [
	"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",
]

const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const getWalletFromPrivateKey = (privateKey: string) => {

	try {
		const key = base58.decode(privateKey)
		const keypair = Keypair.fromSecretKey(key);

		const publicKey = keypair.publicKey.toBase58()
		const secretKey = base58.encode(keypair.secretKey)

		return { publicKey, secretKey, wallet: keypair }
	} catch (error) {
		return null;
	}
}

class JitoBundle {
	private engineURL: string = ""
	private reqCount: number = 0
	constructor(blockengineURL: string) {
		this.engineURL = blockengineURL
		this.onIdle()
	}

	public IsBusy = () => {
		return this.reqCount >= MAX_REQ_COUNT
	}

	public sendBundle = async (bundleTransactions: any[], feePayer: any, key: string): Promise<boolean> => {
		const wallet: any = getWalletFromPrivateKey(key)
		const seacher = searcherClient(
			this.engineURL,
			wallet.wallet
		);
		const _tipAccount = (await seacher.getTipAccounts())[0];
		const tipAccount = new PublicKey(_tipAccount);

		let transactionsConfirmResult: boolean = false
		let breakCheckTransactionStatus: boolean = false
		try {
			const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
			let bundleTx = new Bundle(bundleTransactions, JITO_BUNDLE_LIMIT_SIZE);
			bundleTx.addTipTx(feePayer, JITO_BUNDLE_TIP, tipAccount, recentBlockhash);

			seacher.onBundleResult(
				async (bundleResult: any) => {
					// console.log(bundleResult);

					if (bundleResult.rejected) {
						try {
							if (bundleResult.rejected.simulationFailure.msg.includes("custom program error") ||
								bundleResult.rejected.simulationFailure.msg.includes("Error processing Instruction")) {
								breakCheckTransactionStatus = true
							}
							else if (bundleResult.rejected.simulationFailure.msg.includes("This transaction has already been processed") ||
								bundleResult.rejected.droppedBundle.msg.includes("Bundle partially processed")) {
								transactionsConfirmResult = true
								breakCheckTransactionStatus = true
							}
						} catch (error) {

						}
					}
				},
				(error) => {
					// console.log("Bundle error:", error);
					breakCheckTransactionStatus = true
				}
			);
			await seacher.sendBundle(bundleTx);
			setTimeout(() => { breakCheckTransactionStatus = true }, 20000)
			const trxHash = base58.encode(bundleTransactions[bundleTransactions.length - 1].signatures[0])
			while (!breakCheckTransactionStatus) {
				await sleep(500)
				try {
					const result = await connection.getSignatureStatus(trxHash, {
						searchTransactionHistory: true,
					});
					if (result && result.value && result.value.confirmationStatus) {
						transactionsConfirmResult = true
						breakCheckTransactionStatus = true
					}
				} catch (error) {
					transactionsConfirmResult = false
					breakCheckTransactionStatus = true
				}
			}
			return transactionsConfirmResult
		} catch (error) {
			// console.error("Creating and sending bundle failed...", error);
			// await utils.sleep(10000)
			return false
		}
	}

	private onIdle = async () => {
		if (this.reqCount) {
			this.reqCount--
		}

		setTimeout(() => { this.onIdle() }, DELAY_PER_REQ)
	}
}

export class JitoBundler {
	private bundlers: any[] = []
	public constructor() {
		for (let url of JITO_BLOCK_ENGINES) {
			this.bundlers.push(new JitoBundle(url))
		}
	}

	private getIdleBundle = async (): Promise<JitoBundle> => {
		while (true) {
			let randIdx = Math.floor(Math.random() * JITO_BLOCK_ENGINES.length)
			if (!this.bundlers[randIdx].IsBusy()) {
				return this.bundlers[randIdx]
			}
			await sleep(100)
		}
	}

	private getJitoKey = (): string => {
		return JITO_AUTH_KEYS[Math.floor(Math.random() * JITO_AUTH_KEYS.length)]
	}

	public sendBundles = async (bundleTransactions: any[], payer: any, maxRetry: number = 2): Promise<boolean> => {
		const len: number = bundleTransactions.length
		console.log("jito requesting ", len);

		if (!bundleTransactions.length || bundleTransactions.length > 5) {
			return false
		}

		const jitoBundle: JitoBundle = await this.getIdleBundle()

		const result: boolean = await jitoBundle.sendBundle(bundleTransactions, payer ? payer.wallet : null, this.getJitoKey())
		maxRetry--
		if (!result && maxRetry) {
			await sleep(500)
			return await this.sendBundles(bundleTransactions.slice(0, len), payer, maxRetry)
		}
		return result
	}
}