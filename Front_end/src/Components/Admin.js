import { useState, useEffect } from "react";
import { createEthereumContract } from "../Utils/Constants";
import { useNavigate } from "react-router-dom";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";
import axios from "axios";


function Admin() {
    const [admin, setAdmin] = useState(false);
    const [authKeys, setAuthKeys] = useState(false);
    const [authPubK, setAuthPubK] = useState("");
    const [authSecK, setAuthSecK] = useState("");

    const navigate = useNavigate();
    useEffect(() => {
        const adminCheck = async () => {
            const adminCheck = localStorage.getItem("address");
            console.log(adminCheck);
            const transactionContract = await createEthereumContract();
            const adminAddress = await transactionContract.showAdminAddress();
            if (adminCheck.toLowerCase() === adminAddress.toLowerCase())
                setAdmin(true);
            else
                navigate("/Error");
        }
        adminCheck();
        const authKeys = async () => {
            try {
                const res = await axios.get("http://localhost:8000/getAuthKeys");
                console.log("RESP", res.data);
                if (res.data === 404)
                    setAuthKeys(true)
                else if (res.data !== 404) {
                    console.log("Auth keys found");
                    const bufferP = Buffer.from(res.data.publicKey);
                    const bufferS = Buffer.from(res.data.privateKey);

                    const pubK = new X25519PublicKey(bufferP);
                    const secK = new X25519SecretKey(bufferS);
                    setAuthPubK(pubK);
                    setAuthSecK(secK);
                }
                else
                    console.log("Internal Server Error");
            } catch (error) {
                console.log("Error msg", error.message);
            }
        }
        authKeys();
    }, []);

    const genAuthKeys = async () => {
        const sodium = await SodiumPlus.auto();
        const keypair = await sodium.crypto_box_keypair();
        const privateKeyObj = await sodium.crypto_box_secretkey(keypair);
        const publicKeyObj = await sodium.crypto_box_publickey(keypair);
        const privateKey = privateKeyObj.buffer;
        const publicKey = publicKeyObj.buffer;

        try {
            const res = await axios.post("http://localhost:8000/uploadAuthKeys", {
                publicKey,
                privateKey
            });
            if (res.data !== 500) {
                const bufferP = Buffer.from(res.data.publicKey);
                const bufferS = Buffer.from(res.data.privateKey);

                const pubK = new X25519PublicKey(bufferP);
                const secK = new X25519SecretKey(bufferS);
                setAuthPubK(pubK);
                setAuthSecK(secK);
                setAuthKeys(false);
            }
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("Error msg", error.message);
        }

        try {
            const res = await axios.post("http://localhost:8000/uploadAuthPubKey", {
                publicKey
            })
            if (res.data !== 500)
                console.log("Data", res.data);
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("Error", error.message);
        }

    }

    function showAuthKeys() {
        console.log("Public Key of Authorizers", authPubK.toString('hex'));
        console.log("Private Keys of Authorzer", authSecK.toString('hex'));
    }

    return (
        <div style={{ textAlign: "center" }}>
            <h1>Admin Page</h1>
            {admin && (
                <>
                    <button className="bttn">Add New Authorizer</button>
                    {authKeys ? (<button className="bttn" style={{ marginLeft: '5px' }} onClick={genAuthKeys}>Generate Authorizer Keys</button>) : (<button className="bttn" style={{ marginLeft: '5px' }} onClick={showAuthKeys}>Show Authorizer Keys</button>)}
                </>
            )}
        </div>
    );
}

export default Admin;