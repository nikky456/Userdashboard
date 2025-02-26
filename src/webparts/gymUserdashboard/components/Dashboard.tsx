import React from "react";
import { Table, Container, Card, Spinner } from "react-bootstrap";
import moment from "moment";
import { Web } from "sp-pnp-js";
import "./Style.css";
import { TextField,PrimaryButton,DefaultButton } from '@fluentui/react';
import { Panel, PanelType, } from "@fluentui/react/lib/Panel";
import Swal from "sweetalert2";


const Dashboard: React.FC = () => {
  const [clientData, setClientData] = React.useState<Record<string, any> | null>(null);
  const [referralData, setReferralData] = React.useState<any[]>([]);
  const [formdata, setFormdata] = React.useState({
    Title: "",
    Email: "",
    PhoneNumber: "",
    Status: "",
    Response: "",
    CallSchedule: "",
    // Created: "",
    });

    const [paymentData, setPaymentData] = React.useState({
      PaymentDate: "",
      Amount: "",
      Status: "",
      MembershipPlan: "",
    });
    const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isPaymentPanelOpen, setIsPaymentPanelOpen] = React.useState(false);
 
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("userId");


  const buttonStyles = { root: { marginRight: 8 } };

  const fetchClientData = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const web = new Web("https://smalsusinfolabs.sharepoint.com/sites/F4S");

      const clientRes = await web.lists
        .getByTitle("Clients")
        .items.select("Id", "FullName", "Age", "CellPhone", "JoiningDate", "MembershipPlan", "EndDate", "PaymentHistory","Photo")
        .filter(`Id eq '${userId}'`)
        .top(1)
        .get();

      if (clientRes.length > 0) {
        const user = clientRes[0];
        setClientData({
          ...user,
          JoiningDate: user.JoiningDate ? moment(user.JoiningDate).format("DD/MM/YYYY") : null,
          EndDate: user.EndDate ? moment(user.EndDate).format("DD/MM/YYYY") : null,
          PaymentHistory: user.PaymentHistory ? JSON.parse(user.PaymentHistory) : [],
        });
      } else {
        setClientData(null);
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralData = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const web = new Web("https://smalsusinfolabs.sharepoint.com/sites/F4S");

      const referralRes = await web.lists
        .getByTitle("Referral")
        .items.select(
          "Title", "ID", "Email", "PhoneNumber", "Status", "Response", "Created",
          "CallSchedule", "Author/Id", "Author/Title", "Editor/Id", "Editor/Title", "Referredby/Id", "Referredby/FullName"
        )
        .expand("Author,Editor,Referredby")
        .getAll();

      const filteredReferrals = referralRes.filter((referral: any) => referral.Referredby?.Id?.toString() === userId);
      setReferralData(filteredReferrals);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (userId) {
      fetchClientData();
      fetchReferralData();
    }
  }, [userId]);

  const statusOptions = ["Pending", "Paid", "UnPaid"];
  const membershipOptions = ["Annual", "Bi-Annual", "Monthly", "Quarterly"];


  

  const handleAddTask = async () => {
    try {
      const phone =
        formdata.PhoneNumber && !isNaN(Number(formdata.PhoneNumber))
          ? parseInt(formdata.PhoneNumber)
          : null;
  
      const formattedCallSchedule = formdata?.CallSchedule
        ? moment(formdata.CallSchedule).format("YYYY-MM-DDTHH:mm:ss")
        : null;
  
      const postData = {
        Title: formdata?.Title || "",
        Status: formdata?.Status || "",
        PhoneNumber: phone,
        Email: formdata?.Email || "",
        Response: formdata?.Response || "",
        CallSchedule: formattedCallSchedule,
        ReferredbyId: userId,
      };
  
      const web = new Web("https://smalsusinfolabs.sharepoint.com/sites/F4S");
      let res = await web.lists
        .getById("A576144A-556F-4F37-960A-A4ED978EF524")
        .items.add(postData);
  
      console.log("Added item response:", res);
  
      Swal.fire({
        text: "You have successfully added items!",
        icon: "success",
      });
  
      setFormdata({
        Title: "",
        Email: "",
        PhoneNumber: "",
        Status: "",
        Response: "",
        CallSchedule: "",
      });
  
      fetchReferralData();
    } catch (error) {
      console.error("Error adding item:", error);
  
      Swal.fire({
        title: "Error!",
        text: "An error occurred while adding the task.",
        icon: "error",
      });
    }
  
    setIsPanelOpen(false);
  };
  

  const handleChange=(e:any)=>{
    const {name,value}=e.target;
    setFormdata(prevdata=>({
      ...prevdata,
      [name]:value,
     
    }))

   }

   const savePaymentHistory = async () => {
    const { PaymentDate, Amount, Status, MembershipPlan } = paymentData;
    
    if (!PaymentDate || !Amount || !Status || !MembershipPlan) {
      Swal.fire({
        title: "Error!",
        text: "All fields are required!",
        icon: "warning",
      });
      return;
    }
  
    const validUserId = userId ? parseInt(userId, 10) : null;
    if (!validUserId) {
      Swal.fire({
        title: "Error!",
        text: "Invalid user ID!",
        icon: "error",
      });
      return;
    }
  
    setLoading(true);
    try {
      const newPayment = { PaymentDate, Amount, Status, MembershipPlan };
      const updatedHistory = [...(clientData?.PaymentHistory || []), newPayment];
  
      const web = new Web("https://smalsusinfolabs.sharepoint.com/sites/F4S");
      await web.lists
        .getByTitle("Clients")
        .items.getById(validUserId)
        .update({
          PaymentHistory: JSON.stringify(updatedHistory),
        });
  
      setClientData((prev: any) => ({
        ...prev,
        PaymentHistory: updatedHistory,
      }));
  
      Swal.fire({
        title: "Success!",
        text: "Payment added successfully!",
        icon: "success",
      });
  
      closePanel();
    } catch (error) {
      console.error("Error saving payment:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to save payment!",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  
    setIsPaymentPanelOpen(false);
  };
  

 

   const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
   const openPanel = () => {
    setFormdata({
      Title: "",
      Email: "",
      PhoneNumber: "",
      Status: "",
      Response: "",
      CallSchedule: "",
      // Created: "",
  });
    setIsPanelOpen(true);
  };
   const closePanel = () => {
    setIsPanelOpen(false);
  };

  const openPaymentPanel = () => {
    setIsPaymentPanelOpen(true);
  };
   const closePaymentPanel = () => {
    setIsPaymentPanelOpen(false);
  };

  const onRenderFooterContent = React.useCallback(
    () => (
      <div>
        <PrimaryButton onClick={handleAddTask} styles={buttonStyles}>
          Save
        </PrimaryButton>
        <DefaultButton onClick={closePanel}>Cancel</DefaultButton>
      </div>
    ),
    [closePanel,handleAddTask],
  );

  const onRenderFooterPaymentContent = React.useCallback(
    () => (
      <div>
        <PrimaryButton onClick={savePaymentHistory} styles={buttonStyles}>
          Save
        </PrimaryButton>
        <DefaultButton onClick={closePaymentPanel}>Cancel</DefaultButton>
      </div>
    ),
    [savePaymentHistory,closePaymentPanel],
  );

 


  return (
    <div>
      <Container className="mt-4 userdashboard">
        <h1 className="mb-4 text-center">My Dashboard</h1>
       

        {/* Client Details Card */}
        {clientData && (
        <Card 
        className="shadow-sm p-4 mb-4"
        style={{ backgroundColor: "#19657e", boxShadow: "rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px" }}
      >
         <img 
    src="https://fitness4sure.com/assets/img/logo-white.svg" 
    alt="Logo" 
    style={{ 
      position: "absolute", 
      top: "10px", 
      right: "10px", 
      width: "230px", 
      height: "auto" 
    }} 
  />
      
      <div className="d-flex align-items-center gap-4" style={{ color: "white" }}>

      <img
  src={clientData.Photo?.Url || "https://pinnacle.works/wp-content/uploads/2022/06/dummy-image.jpg"}
  className="rounded-circle border border-secondary me-3"
  alt="Profile"
  width="200"
  height="200"
/>

              <div className="content">
                <h2 className="fw-bold">Name: {clientData.FullName}</h2>
                <p><strong>Age:</strong> {clientData.Age}</p>
                <p><strong>Mobile Number:</strong> {clientData.CellPhone}</p>
                <p><strong>Joining Date:</strong> {clientData.JoiningDate}</p>
                <p><strong>Membership Plan:</strong> {clientData.MembershipPlan}</p>
                <p><strong>End Date:</strong> {clientData.EndDate}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment History Card */}
        <h3 
  className="text-center mb-3"
  style={{ 
    backgroundColor: "#19657e", 
    padding: "15px", 
    color: "#fff" 
  }}
>
  Payment History
</h3>

<div className="d-flex justify-content-end">
  <button
    className="border-0 my-2 px-3 py-2 rounded-2 mx-3 btn btn-primary"
    onClick={openPaymentPanel}
  >
    Add
  </button>
</div>

{clientData?.PaymentHistory.length > 0 ? (
  <Card className="shadow-sm p-4 mb-4 card ">
     <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
    <Table striped bordered hover responsive>
      <thead className="table-light text-center">
        <tr>
          {clientData?.PaymentHistory.some((p: any) => p.PaymentDate) && (
            <th className="text-center">Payment Date</th>
          )}
          {clientData?.PaymentHistory.some((p: any) => p.Status) && (
            <th className="text-center">Status</th>
          )}
          {clientData?.PaymentHistory.some((p: any) => p.Amount) && (
            <th className="text-center">Amount</th>
          )}
          {clientData?.PaymentHistory.some((p: any) => p.MembershipPlan) && (
            <th className="text-center">Membership Plan</th>
          )}
        </tr>
      </thead>
      <tbody>
        {clientData?.PaymentHistory.filter(
          (payment: any) => payment.PaymentDate || payment.Status || payment.Amount || payment.MembershipPlan
        ).map((payment: any, index: number) => (
          <tr key={index} className="text-center">
            {payment.PaymentDate ? (
              <td>{moment(payment.PaymentDate).format("DD/MM/YYYY")}</td>
            ) : (
              <td>-</td>
            )}
            {payment.Status ? <td>{payment.Status}</td> : <td>-</td>}
            {payment.Amount ? <td>₹{payment.Amount}</td> : <td>-</td>}
            {payment.MembershipPlan ? <td>{payment.MembershipPlan}</td> : <td>-</td>}
          </tr>
        ))}
      </tbody>
    </Table>
    </div>
  </Card>
) : (
  <p className="text-center text-muted">No payment history found</p>
)}

<h3 
  className="text-center mb-3"
  style={{ 
    backgroundColor: "#19657e", 
    padding: "15px", 
    color: "#fff" 
  }}
>
  Referral list
</h3>

<div className="d-flex justify-content-end">
  <button
    className="border-0 my-2 px-3 py-2 rounded-2 mx-3  btn btn-primary"
    onClick={openPanel}
  >
    Add
  </button>
</div>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p>Loading...</p>
          </div>
        ) : referralData.length > 0 ? (
          <Card className="shadow-sm p-4 card">
           
            <div className="text-right mb-3 clearfix"
          style={{ marginTop: "-20px" }}>
        

        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
            <Table striped bordered hover responsive>
              <thead className="table-light text-center">
                <tr>
                  <th className="text-center">Name</th>
                  <th className="text-center">Email</th>
                  <th className="text-center">Phone</th>
                  <th className="text-center">Call Appointment</th>
                  <th className="text-center">Created</th>
                  <th className="text-center">Response</th>
                  <th className="text-center">Referred by</th>
                </tr>
              </thead>
              <tbody>
                {referralData.map((referral) => (
                    <tr key={referral.ID} className="text-center">
                    <td>{referral.Title}</td>
                    <td>{referral.Email}</td>
                    <td>{referral.PhoneNumber}</td>
                   
                    <td>
                   {referral.CallSchedule
                 ? moment(referral.CallSchedule).format("DD/MM/YYYY hh:mm:ss A")
                 : " "}
              </td>
                    <td>{moment(referral.Created).format("DD/MM/YYYY")}</td>
                    <td>{referral.Response}</td>
                    <td>{referral.Referredby?.FullName || " "}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            </div>
          </Card>
        ) : (
          <p className="text-center">No referrals found.</p>
        )}
      </Container>

      <div>
          <Panel
            isOpen={isPanelOpen}
            onDismiss={closePanel}
            headerText="Form Details"
            closeButtonAriaLabel="Close"
            onRenderFooterContent={onRenderFooterContent}
            isFooterAtBottom={true}
            type={PanelType.medium}
          >
            <div className="row">
              {/* First Name and Last Name */}
              <div className="col-lg-6">
                <div className="form-group m-2">
                  <h6> Name</h6>
                  <TextField
                    name="Title"
                    value={formdata?.Title || ""}
                    onChange={(e) => handleChange(e)}
                    autoComplete="off"
                    required
                    errorMessage={!formdata?.Title ? "Title  is required" : ""}
                  />
                </div>
              </div>
             

             
              
              <div className="col-lg-6">
                <div className="form-group m-2">
                  <h6>Email</h6>
                  <TextField
                    name="Email"
                    value={formdata?.Email || ""}
                    onChange={(e) => handleChange(e)}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Phone Number and Qualification */}
              <div className="col-lg-6">
                <div className="form-group m-2">
                  <h6>Phone Number</h6>
                  <TextField
                   name="PhoneNumber"
                value={formdata?.PhoneNumber || ""}
              onChange={(e) => handleChange(e)}
             autoComplete="off"
       
             />

                </div>
              </div>
              <div className="col-lg-6">
                <div className="form-group m-2">
                  <h6>CallSchedule</h6>
                  <TextField
                    name="CallSchedule"
                    type="datetime-local"
                    value={formdata?.CallSchedule 
                      ? moment(formdata.CallSchedule).format("YYYY-MM-DDTHH:mm") 
                      : ""}
                    onChange={(e,) => handleChange(e)}
                    autoComplete="off"
                  />
                </div>
              </div>
              
            
                           <div className="col-lg-12">
                              <div className="form-group m-2">
                                 <h6>Response</h6>
                                  <textarea
                                  rows={4}
                                  className="form-control mt-2"
                                name='Response'
                                  value={formdata?.Response}
                                  onChange={handleChange}
                                   autoComplete='off'
                                  
                                   />
                              </div>
                           </div>

                              <div className="col-lg-12">
                              <div className="form-group m-2">
                                  <label>Status</label>
                                  <div className="stream-options mt-2">
                                  <label>
                                      <input
                                      type="radio"
                                      name="Status"
                                      value="New"
                                      className='mx-2'
                                      checked={formdata?.Status === "New"}
                                      onChange={handleChange}
                                      />
                                      <span>New</span>
                                  </label>
                                  <label>
                                      <input
                                      type="radio"
                                      name="Status"
                                      value="Connected"
                                      className='mx-2'
                                      checked={formdata?.Status === "Connected"}
                                      onChange={handleChange}
                                      />
                                      <span>Connected</span>
                                  </label>
                                  <label>
                                      <input
                                      type="radio"
                                      name="Status"
                                      value="Follow-Up"
                                      className='mx-2'
                                      checked={formdata?.Status === "Follow-Up"}
                                      onChange={handleChange}
                                      />
                                      <span>Follow-UP</span>
                                  </label>
                                  <label>
                                      <input
                                      type="radio"
                                      name="Status"
                                      value="Not Interested"
                                      className='mx-2'
                                      checked={formdata?.Status === "Not Interested"}
                                      onChange={handleChange}
                                      />
                                      <span>Not Interested</span>
                                  </label>
                                  <label>
                                      <input
                                      type="radio"
                                      name="Status"
                                      value="Joined"
                                      className='mx-2'
                                      checked={formdata?.Status === "Joined"}
                                      onChange={handleChange}
                                      />
                                      <span>Joined</span>
                                  </label>
                                  
                                  
                                  </div>
                              </div>
                              </div>

             
              
             
              

               
            </div>
          </Panel>
          <div>
          <Panel
        isOpen={isPaymentPanelOpen}
        onDismiss={closePaymentPanel}
        type={PanelType.medium}
        onRenderFooterContent={onRenderFooterPaymentContent}
        headerText="Add Payment"
        closeButtonAriaLabel="Close"
      >
        <div className = "row">
        <div className="col-lg-6">
        <div className="form-group m-2">
          <h6>Payment Date</h6>
          <input
            type="date"
            name="PaymentDate"
            className="form-control"
            value={paymentData.PaymentDate}
            onChange={handlePaymentChange}
          />
        </div>
        </div>
        

        <div className="col-lg-6">
        <div className="form-group m-2">
          <h6>Amount</h6>
          <input
            type="number"
            name="Amount"
            className="form-control"
            value={paymentData.Amount}
            onChange={handlePaymentChange}
          />
        </div>
        </div>

        <div className="col-lg-6">
        <div className="form-group m-2">
          <h6>Status</h6>
          <select
            name="Status"
            className="form-control"
            value={paymentData.Status}
            onChange={handlePaymentChange}
          >
            <option value="">Select Status</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        </div>

        <div className="col-lg-6">
        <div className="form-group m-2">
          <h6>Membership Plan</h6>
          <select
            name="MembershipPlan"
            className="form-control"
            value={paymentData.MembershipPlan}
            onChange={handlePaymentChange}
          >
            <option value="">Select Plan</option>
            {membershipOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        </div>

        </div>
      </Panel>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
