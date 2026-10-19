import { Link } from "react-router";
import { SearchX } from "lucide-react";
import { EmptyState } from "../components/ui";

const NotFound = () => (
    <div className="container" style={{ paddingTop: 64 }}>
        <EmptyState
            icon={SearchX}
            title="This page isn't on the menu"
            action={
                <Link to="/" className="btn btn-primary">
                    Back to the menu
                </Link>
            }
        >
            The link may be old or mistyped. Everything we cook is one click away.
        </EmptyState>
    </div>
);

export default NotFound;
