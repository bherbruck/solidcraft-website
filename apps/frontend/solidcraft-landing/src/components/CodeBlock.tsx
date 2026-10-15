import { useEffect, useState } from "react";

export default function CodeBlock({
	command,
	label = "TERMINAL",
}: {
	command: string;
	label?: string;
}) {
	const [ready, setReady] = useState(false);
	const [status, setStatus] = useState("");
	useEffect(() => setReady(true), []);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(command);
			setStatus("Copied.");
		} catch {
			setStatus(
				"Couldn't copy automatically. Select the command to copy it manually.",
			);
		}
	};
	return (
		<div className="copy-component">
			<div className="code-block">
				<div className="code-toolbar">
					<span>{label}</span>
					<button
						className="copy-button"
						hidden={!ready}
						onClick={copy}
						type="button"
					>
						Copy command
					</button>
				</div>
				<pre>
					<code>{command}</code>
				</pre>
			</div>
			<span aria-live="polite" className="copy-status" role="status">
				{status}
			</span>
		</div>
	);
}
