import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  BN,
  Cluster,
  CreateStreamParams,
  getBN,
  StreamClient,
} from "@streamflow/stream";
import { useMemo, useState } from "react";

interface IProps {
  className?: string;
}

interface IStreamUserInputs {
  name?: string;
  recipient?: string;
  period?: string;
  canTopup: boolean;
  cancelableBySender: boolean;
}

interface IValidationErrors {
  name?: string;
  recipient?: string;
  period?: string;
}

const TokenStreamForm = ({ className }: IProps) => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [errors, setErrors] = useState<IValidationErrors>({});

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

      const stream: CreateStreamParams = {
        sender: wallet!, // Wallet/Keypair signing the transaction, creating and sending the stream.
        recipient: userInputs.recipient!, // Solana recipient address. - "4ih00075bKjVg000000tLdk4w42NyG3Mv0000dc0M00"
        mint: "DNw99999M7e24g99999999WJirKeZ5fQc6KY999999gK", // SPL Token mint.
        start: streamVestingStartTime.getTime() / 1000, // Timestamp (in seconds) when the stream/token vesting starts.
        depositedAmount: getBN(1000000000000, 9), // Deposited amount of tokens (using smallest denomination).
        period: parseInt(userInputs.period!), // Time step (period) in seconds per which the unlocking occurs. eg 1
        cliff: streamCliffStartTime.getTime() / 1000, // Vesting contract "cliff" timestamp in seconds.
        cliffAmount: new BN(100000000000), // Amount (smallest denomination) unlocked at the "cliff" timestamp.
        amountPerPeriod: getBN(5000000000, 9), // Release rate: how many tokens are unlocked per each period.
        name: userInputs.name!, // The stream name or subject.
        canTopup: userInputs.canTopup, // setting to FALSE will effectively create a vesting contract.
        cancelableBySender: userInputs.cancelableBySender, // Whether or not sender can cancel the stream.
        cancelableByRecipient: false, // Whether or not recipient can cancel the stream.
        transferableBySender: true, // Whether or not sender can transfer the stream.
        transferableByRecipient: false, // Whether or not recipient can transfer the stream.
        connection,
      };

      //   await streamClient.create(stream);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <form className={className} onSubmit={createTokenStream}>
      <h5 className="text-center bg-light py-3 rounded">TOKEN STREAM</h5>
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
