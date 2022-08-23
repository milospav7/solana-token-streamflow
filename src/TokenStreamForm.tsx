import { Wallet } from "@project-serum/anchor";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  BN,
  Cluster,
  CreateParams,
  getBN,
  StreamClient,
} from "@streamflow/stream";
import { useEffect, useMemo, useState } from "react";

interface IProps {
  className?: string;
}

interface IStreamUserInputs {
  name?: string;
  recipient?: string;
  period?: string;
  mint?: string;
  canTopup: boolean;
  cancelableBySender: boolean;
}

interface IValidationErrors {
  name?: string;
  recipient?: string;
  period?: string;
  mint?: string;
}

const TokenStreamForm = ({ className }: IProps) => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [errors, setErrors] = useState<IValidationErrors>({});
  const [tokens, setTokens] = useState<string[]>([]);

  const setAllowedTokenList = async () => {
    let availableTokenMints: string[] = [];
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      new PublicKey(wallet?.publicKey.toBase58()!),
      {
        programId: TOKEN_PROGRAM_ID,
      }!
    );
    tokenAccounts.value.forEach((tokenAccount) => {
      const accountData = AccountLayout.decode(tokenAccount.account.data);
      if (accountData.amount)
        availableTokenMints.push(accountData.mint.toBase58());
    });
    console.log(availableTokenMints);
    setTokens(availableTokenMints);
  };

  useEffect(() => {
    setAllowedTokenList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamClient = useMemo(
    () =>
      new StreamClient(
        "https://api.devnet.solana.com",
        Cluster.Devnet,
        "confirmed"
      ),
    []
  );

  const validateStreamInputs = (inputs: IStreamUserInputs) => {
    let hasValidationErrors = false;
    let validationErrors: IValidationErrors = {};

    if (!inputs.name || !inputs.name.trim())
      validationErrors.name = "Field is required";
    if (!inputs.recipient || !inputs.recipient.trim())
      validationErrors.recipient = "Field is required";
    if (!inputs.period) validationErrors.period = "Field is required";
    if (!inputs.mint) validationErrors.mint = "Field is required";

    hasValidationErrors = Object.keys(errors).length > 0;

    setErrors(validationErrors);

    return { hasValidationErrors, validationErrors };
  };

  const createTokenStream = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const userInputs: IStreamUserInputs = {
        name: formData.get("name")?.toString(),
        mint: formData.get("mint")?.toString(),
        recipient: formData.get("recipient")?.toString(),
        period: formData.get("period")?.toString(),
        canTopup: formData.get("canTopup") === "on",
        cancelableBySender: formData.get("cancelableBySender") === "on",
      };

      const { hasValidationErrors } = validateStreamInputs(userInputs);
      if (hasValidationErrors) return;

      const streamVestingStartTime = new Date();
      const streamCliffStartTime = new Date();
      streamVestingStartTime.setDate(streamVestingStartTime.getDate() + 1);
      streamCliffStartTime.setDate(streamCliffStartTime.getDate() + 2);

      const stream: CreateParams = {
        sender: wallet as Wallet,
        name: userInputs.name!,
        recipient: userInputs.recipient!, // 9f5LBDmA1enRXXXqGLSfD9ycRH7qyk4Kcb8smFvk8t8W or 9TXGSBMePiFgRb2bLEQTtUfccLx7ZmkY6HpW1vXZf4Bb
        mint: userInputs.mint!,
        depositedAmount: getBN(100, 9),
        start: streamVestingStartTime.getTime() / 1000, // in seconds
        period: parseInt(userInputs.period!), // in seconds
        amountPerPeriod: getBN(10, 9),
        cliff: streamCliffStartTime.getTime() / 1000, // in seconds.
        cliffAmount: new BN(5),
        canTopup: userInputs.canTopup,
        cancelableBySender: userInputs.cancelableBySender,
        cancelableByRecipient: false,
        transferableBySender: true,
        transferableByRecipient: false,
      };
      const response = await streamClient.create(stream);
      console.log("response", response);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <form className={className} onSubmit={createTokenStream}>
      <h5 className="text-center bg-light py-3 rounded">TOKEN STREAM</h5>
      <div className="mb-3">
        <label className="form-label">SPL Token</label>
        <select name="mint" className="form-select">
          {tokens.map((token) => (
            <option key={token} value={token}>
              {token}
            </option>
          ))}
        </select>
        {errors.mint && <small className="text-danger">*{errors.mint}</small>}
      </div>
      <div className="mb-3">
        <label className="form-label">Stream name</label>
        <input autoFocus type="text" name="name" className="form-control" />
        {errors.name && <small className="text-danger">*{errors.name}</small>}
      </div>
      <div className="mb-3">
        <label className="form-label">Recipient address</label>
        <input
          type="text"
          name="recipient"
          className="form-control"
          placeholder="Recipient address on Solana.."
        />
        {errors.recipient && (
          <small className="text-danger">*{errors.recipient}</small>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Unlock period</label>
        <input
          type="number"
          min={1}
          name="period"
          className="form-control"
          placeholder="Period step in seconds..."
        />
        {errors.period && (
          <small className="text-danger">*{errors.period}</small>
        )}
      </div>
      <div className="mb-3 form-check">
        <input name="canTopup" type="checkbox" className="form-check-input" />
        <label className="form-check-label">Can be topped up</label>
      </div>
      <div className="mb-3 form-check">
        <input
          name="cancelableBySender"
          type="checkbox"
          className="form-check-input"
        />
        <label className="form-check-label">
          Can be cancelled by recipient
        </label>
      </div>
      <div className="border-muted border-top d-flex py-3">
        <button type="submit" className="btn btn-success mx-auto">
          CREATE STREAM
        </button>
      </div>
    </form>
  );
};

export default TokenStreamForm;
