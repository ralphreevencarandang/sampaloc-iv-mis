import assert from "node:assert/strict";
import { test } from "node:test";
import { residentRegistrationSchema, adminResidentUpdateSchema } from "../validations/auth.validation";
import { mobileNationalNumber } from "../lib/resident-contact";

const resident = {
  email: "synthetic@example.invalid", password: "Example123!", confirmPassword: "Example123!",
  firstName: "Juan", middleName: "", lastName: "Dela Cruz", birthDate: "2000-01-01",
  gender: "Male", civilStatus: "Single", street: "Test", houseNumber: "1", contactNumber: "9123456789",
  citizenship: "Filipino", isVoter: "No", is4Ps: "No", isPwd: "No", status: "PENDING",
  validIDImageName: "id.png", idType: "National ID", idNumber: "synthetic-id",
};

for (const [label, schema] of [["create", residentRegistrationSchema], ["edit", adminResidentUpdateSchema]] as const) {
  test(`${label}: all names accept accented letters and separators, normalize spaces and reject invalid characters`, () => {
    for (const name of ["  María   Luisa  ", "Peña", "Jose\u0301", "D'Angelo", "O’Reilly", "Anne-Marie", "Ñora"]) {
      const parsed = schema.safeParse({ ...resident, firstName: name, middleName: name, lastName: name });
      assert.ok(parsed.success, name);
      assert.equal(parsed.data.firstName, name.normalize("NFC").trim().replace(/\s+/g, " "));
    }
    for (const field of ["firstName", "middleName", "lastName"]) {
      for (const name of ["Juan2", "123", "Ana@", "Test.", "Name_", "😀", "---", "\u0301"] ) {
        const parsed = schema.safeParse({ ...resident, [field]: name });
        assert.equal(parsed.success, false, `${field}: ${name}`);
        if (!parsed.success) assert.ok(parsed.error.issues.some(issue => issue.path[0] === field && issue.message === "Name must contain letters only."));
      }
    }
    assert.ok(schema.safeParse({ ...resident, middleName: "   " }).success);
    assert.equal(schema.safeParse({ ...resident, firstName: "   " }).success, false);
  });

  test(`${label}: Philippine mobile formats normalize and invalid input fails`, () => {
    for (const number of ["9123456789", "09123456789", "639123456789", "+639123456789", "+63 912-345-6789", "(0912) 345 6789"]) {
      const parsed = schema.safeParse({ ...resident, contactNumber: number });
      assert.ok(parsed.success, number);
      assert.equal(parsed.data.contactNumber, "+639123456789");
      assert.equal(mobileNationalNumber(number), "9123456789");
    }
    for (const number of ["", "8123456789", "912345678", "91234567890", "+638123456789", "+649123456789", "abc9123456789", "9!123456789", "９１２３４５６７８９"]) {
      const parsed = schema.safeParse({ ...resident, contactNumber: number });
      assert.equal(parsed.success, false, number);
      if (!parsed.success) assert.ok(parsed.error.issues.some(issue => issue.path[0] === "contactNumber" && issue.message === "Enter a valid Philippine mobile number."));
    }
  });
}

test("password strength and confirmation remain required", () => {
  for (const password of ["short", "alllowercase1!", "NoNumbers!", "NoSpecial123"]) {
    assert.equal(residentRegistrationSchema.safeParse({ ...resident, password, confirmPassword: password }).success, false);
  }
  const parsed = residentRegistrationSchema.safeParse({ ...resident, confirmPassword: "Different123!" });
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.ok(parsed.error.issues.some(issue => issue.path[0] === "confirmPassword" && issue.message === "Passwords do not match."));
});
