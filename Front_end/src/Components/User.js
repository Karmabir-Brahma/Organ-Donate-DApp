import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { createEthereumContract } from "../Utils/Constants";
import { SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";

function User() {
    const [name, setName] = useState();
    const [email, setEmail] = useState();
    const [address, setAddress] = useState();
    const [userPubK, setUserPubK] = useState();
    const [userSecK, setUserSecK] = useState();
    const [nonce, setNonce] = useState();
    const [generateKeys, setGenerateKeys] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function getUserData() {
            const transactionsContract = await createEthereumContract();
            const walletAddress = localStorage.getItem("address");
            try {
                // setAddress
                const data = await transactionsContract.getCid_DonorAcc(walletAddress);
                console.log("DATA:", walletAddress);
                if (data) {
                    try {
                        // const response = await fetch(`https://${data}.ipfs.dweb.link/info.json`);
                        const response = await fetch(`https://bkrgateway.infura-ipfs.io/ipfs/${data}`);
                        const res = await response.json();
                        setName(res.name);
                        setEmail(res.email);
                        setAddress(res.address);
                    } catch (error) {
                        console.log(error);
                    }
                    try {
                        const response = await axios.post("http://localhost:8000/getUserKeys",
                            { walletAddress });
                        console.log("D", walletAddress);
                        if (response.data !== 404) {
                            response.data.nonce = Buffer.from(response.data.nonce);

                            const bufferP = Buffer.from(response.data.publicKey);
                            const bufferS = Buffer.from(response.data.privateKey);

                            const pubK = new X25519PublicKey(bufferP);
                            const secK = new X25519SecretKey(bufferS);
                            setUserPubK(pubK);
                            setUserSecK(secK);
                        }
                        else if (response.data === 404) {
                            console.log("No keys found");
                            setGenerateKeys(true);
                        }
                        else
                            console.log("Internal Server Error");
                    } catch (error) {
                        console.log("Error", error.message);
                    }
                }
                else {
                    console.log("No data was found");
                    navigate("/Create");
                }
            } catch (error) {
                console.log("Error");
            }
        }
        getUserData();
    }, []);

    const genKeys = async () => {
        const sodium = await SodiumPlus.auto();
        const keypair = await sodium.crypto_box_keypair();
        const privateKeyObj = await sodium.crypto_box_secretkey(keypair);
        const publicKeyObj = await sodium.crypto_box_publickey(keypair);
        const nonce = await sodium.randombytes_buf(24);
        const privateKey = privateKeyObj.buffer;
        const publicKey = publicKeyObj.buffer;

        try {
            const response = await axios.post("http://localhost:8000/uploadUserKeys", {
                address,
                publicKey,
                privateKey,
                nonce,
            });

            if (response.data !== 500) {
                console.log(response.data);
                setUserPubK(publicKeyObj);
                setUserSecK(privateKeyObj);
                setNonce(nonce);
                setGenerateKeys(false);
            }
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("Error:", error.message);
        }
    }

    function showKeys() {
        console.log("Public Key:", userPubK.toString('hex'));
        console.log("Private Key:", userSecK.toString('hex'));
    }

    return (
        <>
            <div className="user_box">
                <h2>Welcome Saviour <strong>{name}</strong></h2>
                <p>
                    Thank you for taking the first step towards saving lives! <br />Your compassion knows no bounds.
                    <br />Just a few clicks away, you're <br />making a difference that last a lifetime.
                    <br />Let's embark on this journey of hope together!
                </p>
            </div>
            <div className="App">
                <div>
                    <button className="bttn" onClick={(e) => navigate("/LivingDonor")}>Living Donor</button>
                    <button className="bttn" style={{ marginLeft: '5px' }}>Brain Death Donor</button>
                </div>
                <br />
                {generateKeys ? (<button className="bttn" onClick={genKeys}>Generate Keys</button>) : ("")}
            </div >
        </>
    )
}

export default User;