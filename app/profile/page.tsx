"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("firstName, lastName, dateOfBirth, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.firstName ?? "");
        setLastName(profile.lastName ?? "");
        setDateOfBirth(
          profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
            : ""
        );
        setPhone(profile.phone ?? "");
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: dateOfBirth || null,
        phone: phone || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profile saved successfully!");
  }

  return (
    <main>
      <h1>Complete Your MediVault Profile</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
          />
        </div>

        <div>
          <label>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name"
          />
        </div>

        <div>
          <label>Date of Birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
          />
        </div>

        <button type="submit">Save Profile</button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}