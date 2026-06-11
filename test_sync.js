async function runTest() {
  const url = "https://script.google.com/macros/s/AKfycbysnyaEYmkcCQ42_keBWRC_cS0C_ICqs2RmBRB5rImw1sZpy00YwSmbSvTR0LBevVpN1Q/exec";

  const testPayload = {
    members: [
      { id: "m-1781146207521-pge1", name: "Phạm Thế Hiển", role: "Thành viên gia đình", avatarColor: "bg-blue-500", messengerLink: "", messengerId: "" },
      { id: "m-1781146217534-5mik", name: "Đoàn Công Toàn", role: "Thành viên gia đình", avatarColor: "bg-blue-500", messengerLink: "", messengerId: "" },
      { id: "m-1781146226948-gmn5", name: "Phạm Minh Tuấn", role: "Thành viên gia đình", avatarColor: "bg-blue-500", messengerLink: "", messengerId: "" }
    ],
    expenses: [
      {
        id: "e-1781150063537-t3ey",
        title: "test",
        amount: 150000,
        categoryId: "food",
        date: "2026-06-11",
        paidById: "m-1781146207521-pge1",
        beneficiaryIds: ["m-1781146207521-pge1", "m-1781146217534-5mik", "m-1781146226948-gmn5"],
        notes: "",
        createdAt: 1781150063537
      }
    ],
    payments: [
      {
        month: "2026-06",
        fromId: "m-1781146217534-5mik",
        toId: "m-1781146207521-pge1",
        isSettled: true
      }
    ]
  };

  console.log("1. Sending test POST payload (syncing checkmark)...");
  try {
    const postRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(testPayload)
    });
    const postData = await postRes.json();
    console.log("POST Response:", postData);

    console.log("\n2. Fetching GET data (pulling checkmark)...");
    const getRes = await fetch(url, { redirect: "follow" });
    const getData = await getRes.json();
    console.log("GET Response Keys:", Object.keys(getData));
    console.log("GET Response Payments:", getData.payments);
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

runTest();
