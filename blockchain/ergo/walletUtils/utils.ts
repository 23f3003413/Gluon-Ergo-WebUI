import {
  installNautilus,
  noti_option_close,
  txSubmmited,
} from "@/components/shared/Notifications/Toast";
import { Id, toast } from "react-toastify";
import { SignedTransaction } from "@nautilus-js/eip12-types";
import { walletLocalStorage } from "@/components/wallet/ConnectWallet";
import {
  MOutputInfo,
  OutputInfo,
  RegisterType,
} from "@/blockchain/ergo/explorerApi";
import { ErgoTransactionOutput, Registers } from "@/types/nodeApi";

/* ---------------- Wallet connection helpers ---------------- */

export const isErgoDappWalletConnected = async () => {
  if ((window as any).ergoConnector?.nautilus) {
    return (await (window as any).ergoConnector.nautilus.isConnected()) as boolean;
  }
  return false;
};

export const checkWalletConnection = async (
  walletConfig: walletLocalStorage | undefined
) => {
  return walletConfig
    ? walletConfig.walletName === "ergopay"
      ? true
      : await isErgoDappWalletConnected()
    : await isErgoDappWalletConnected();
};

export const getWalletConnection = async () => {
  if ((window as any).ergoConnector?.nautilus) {
    return await (window as any).ergoConnector.nautilus.connect();
  }

  toast.warn("Click me to install Nautilus Ergo Wallet", installNautilus);
  return false;
};

export const getWalletConn = async () => {
  const walletConnection = await getWalletConnection();

  if (!walletConnection) {
    toast.dismiss();
    toast.warn("Please connect wallet", noti_option_close("try-again"));
    return false;
  }
  return true;
};

/* ---------------- Transaction logic (FIXED) ---------------- */

export const signAndSubmitTx = async (
  unsignedTransaction: any,
  ergo: any,
  txBuilding_noti: Id,
  isMainnet: boolean
) => {
  let signedTransaction: SignedTransaction;

  /* ---- SIGN TX ---- */
  try {
    signedTransaction = await ergo!.sign_tx(unsignedTransaction);

    toast.update(txBuilding_noti, {
      render: "Transaction signed successfully",
      type: "success",
      isLoading: false,
      autoClose: false,
    });
  } catch (error: any) {
    console.error(error);

    if ("code" in error) {
      toast.dismiss();
      toast.warn("Transaction canceled by user", noti_option_close("try-again"));
      return;
    }

    throw error;
  }

  /* ---- SUBMIT TX (FIX FOR ISSUE #48) ---- */
  try {
    const hash = await ergo!.submit_tx(signedTransaction);

    if (!hash) {
      throw new Error("Transaction broadcast failed");
    }

    console.log("tx hash:", hash);
    toast.dismiss();
    txSubmmited(hash, isMainnet);
  } catch (error: any) {
    console.error("Transaction submit failed:", error);
    toast.dismiss();

    toast.error(
      `Transaction failed: ${error?.message || "Broadcasting error"}`,
      {
        ...noti_option_close("tx-failed"),
      }
    );
  }
};

/* ---------------- Helpers ---------------- */

export function outputInfoToErgoTransactionOutput(
  output: OutputInfo | MOutputInfo
): ErgoTransactionOutput {
  return {
    boxId: output.boxId,
    value: output.value,
    ergoTree: output.ergoTree,
    creationHeight: output.creationHeight,
    assets: output.assets!.map((token) => ({
      tokenId: token.tokenId,
      amount: token.amount,
    })),
    additionalRegisters: (
      Object.keys(output.additionalRegisters) as RegisterType[]
    ).reduce(
      (obj: Partial<Record<RegisterType, string>>, key: RegisterType): Registers => {
        if (output.additionalRegisters[key]) {
          obj[key] = output.additionalRegisters[key]?.serializedValue;
        }
        return obj;
      },
      {} as Partial<Record<RegisterType, string>>
    ),
    transactionId: output.transactionId,
    index: output.index,
    spentTransactionId: output.spentTransactionId,
  };
}

export const removeBackslashes = (input: string) => {
  try {
    const jsonObject = JSON.parse(input);
    return JSON.stringify(jsonObject, null, 2);
  } catch (error) {
    console.error("Error parsing the input string:", error);
    return "";
  }
};

export const nanoErgsToErgs = (nanoErgs: number) => nanoErgs / Math.pow(10, 9);
export const ergsToNanoErgs = (ergs: number) => ergs * Math.pow(10, 9);

export const UIFriendlyValue = (input: number, divisor?: number) =>
  input / Math.pow(10, divisor ?? 9);

export const APIFriendlyValue = (input: number, divisor?: number) =>
  input * Math.pow(10, divisor ?? 9);
