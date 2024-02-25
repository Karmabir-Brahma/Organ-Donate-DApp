import { useState, useEffect } from "react";
import axios from "axios";
import { SodiumError, SodiumPlus, X25519PublicKey, X25519SecretKey } from "sodium-plus";

function Authorizer() {
    const [authPubK, setAuthPubK] = useState();
    const [authSecK, setAuthSecK] = useState();
    const [pdfUrl1, setPdfUrl1] = useState();
    const [medPdfUrl, setmedPdfUrl] = useState();
    const [userDatas, setUserDatas] = useState([]);
    const [hideButton, setHideButton] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get("http://localhost:8000/getAuthKeys");
                if (res.data !== 404) {
                    const bufferP = Buffer.from(res.data.publicKey);
                    const bufferS = Buffer.from(res.data.privateKey);

                    const pubK = new X25519PublicKey(bufferP);
                    const secK = new X25519SecretKey(bufferS);
                    setAuthPubK(pubK);
                    setAuthSecK(secK);
                }
                else if (res.data === 404)
                    console.log("Data not found");
                else
                    console.log("Internal Server Error");
            } catch (error) {
                console.log("Error", error);
            }
        }
        fetchData();
    }, []);

    async function showDatas(e) {
        try {
            const res = await axios.get("http://localhost:8000/getUserData");
            if (res.data !== 404) {
                console.log("Fetched user datas", res.data);
                const retrivedData = res.data;
                const sodium = await SodiumPlus.auto();

                const patientDatas = retrivedData.map(async (data) => {
                    const nonce = Buffer.from(data.nonce);
                    const cipherText = Buffer.from(data.cipherText);
                    const cipherText2 = Buffer.from(data.cipherText2);
                    const cipherText3 = Buffer.from(data.cipherText3);
                    const bufferP = Buffer.from(data.publicKey);
                    const patientPubK = new X25519PublicKey(bufferP);

                    const decryptedBUff = await sodium.crypto_box_open(cipherText, nonce, authSecK, patientPubK);
                    const decryptedBUff2 = await sodium.crypto_box_open(cipherText2, nonce, authSecK, patientPubK); //id proof pdf
                    const decryptedBUff3 = await sodium.crypto_box_open(cipherText3, nonce, authSecK, patientPubK); //Med Record pdf

                    const decryptedObj = JSON.parse(decryptedBUff.toString('utf-8'))

                    const pdfBlob = new Blob([decryptedBUff2], { type: "application/pdf" });
                    const url = URL.createObjectURL(pdfBlob);
                    setPdfUrl1(url);

                    const pdfBlob2 = new Blob([decryptedBUff3], { type: "application/pdf" });
                    const url2 = URL.createObjectURL(pdfBlob2);
                    setmedPdfUrl(url2);

                    console.log("ONE", decryptedObj);
                    return decryptedObj;
                })
                const pData = await Promise.all(patientDatas);
                console.log("DATA", pData);
                setUserDatas(pData);
                setHideButton(true);
            }
            else if (res.data === 404)
                console.log("Data not found");
            else
                console.log("Internal Server Error");
        } catch (error) {
            console.log("User data fetch error", error);
        }
    }

    function idPDF() {
        if (pdfUrl1)
            window.open(pdfUrl1, "_blank");
    }
    function medPDF() {
        if (medPdfUrl)
            window.open(medPdfUrl, "_blank");
    }

    return (
        <div className="container">
            <h1 style={{ textAlign: "center" }}>Authorizer</h1>
            {hideButton ? (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Donor Name</th>
                            <th>Recipient Name</th>
                            <th>Address</th>
                            <th>Phone Number</th>
                            <th>Donor's Id Proof</th>
                            <th>Donor's Medical Record</th>
                            <th>Vote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userDatas.map((patientData, index) => (
                            <tr key={index}>
                                <td>{patientData.type}</td>
                                <td>{patientData.donorName}</td>
                                <td>{patientData.recipientName}</td>
                                <td>{patientData.donorAddress}</td>
                                <td>{patientData.donorPhnNumber}</td>
                                <td><button onClick={idPDF}>View Id proof</button></td>
                                <td><button onClick={medPDF}>View Medical Data</button></td>
                                <td>
                                    <button>Approve</button>
                                    <button style={{ marginLeft: '5px' }}>Dis-Approve</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <button onClick={showDatas}>Show User Datas</button>
            )}

        </div>
    )
}

export default Authorizer;