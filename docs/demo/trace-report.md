Task | Agent | Loop | Duration ms | Tokens | Estimated USD (all attempts)
--- | --- | --- | ---: | ---: | ---:
C001-CH1/Company Analyst/0 | Company Analyst | 97ecaf1c-1f49-45b0-86e7-b4e875ebf4b1 | 28.2 | unknown (mock/unreported) | 0.000000
C001-CH1/Research Profiler/0 | Research Profiler | a9109861-3913-454e-8760-da7d014cd9a5 | 29.0 | unknown (mock/unreported) | 0.000000
C001-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | 1440bc59-9b88-4d8e-ae3e-5ca1f47e2089 | 25.9 | unknown (mock/unreported) | 0.000000
C001-CH1/Critic/0 | Critic | f83c7d57-794a-4a06-834e-1904b74bfd42 | 27.4 | unknown (mock/unreported) | 0.000000
C001-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | 820a9012-5486-46fb-8f0f-c3a96fe02bb4 | 27.5 | unknown (mock/unreported) | 0.000000
C001-CH1/Critic/1 | Critic | a992f62c-ad89-4a2c-9414-1c90fb15b62a | 27.4 | unknown (mock/unreported) | 0.000000
C025-CH1/Company Analyst/0 | Company Analyst | 89c448cc-17ae-4e83-9ecd-c9bb40162fbd | 27.8 | unknown (mock/unreported) | 0.000000
C025-CH1/Research Profiler/0 | Research Profiler | aa945396-ab75-4cb3-91bc-ff5e9992d281 | 28.0 | unknown (mock/unreported) | 0.000000
C025-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | 921e8f18-2e25-4f67-bb2b-48614a3c3518 | 27.7 | unknown (mock/unreported) | 0.000000
C025-CH1/Critic/0 | Critic | 7d47f9a5-7e54-4d86-8713-0f7f354db546 | 28.1 | unknown (mock/unreported) | 0.000000
C025-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | 7b8697b0-9c8d-4153-9fc6-6b8a15a5dac4 | 27.3 | unknown (mock/unreported) | 0.000000
C025-CH1/Critic/1 | Critic | 8b7657f4-c4cb-4cad-986d-23c5b0a50ce7 | 27.3 | unknown (mock/unreported) | 0.000000
C036-CH1/Company Analyst/0 | Company Analyst | 6c5e43a8-e1aa-44bc-9f3a-b6281229653e | 28.0 | unknown (mock/unreported) | 0.000000
C036-CH1/Research Profiler/0 | Research Profiler | 87488653-2df2-4a4f-aab4-3643dedfad94 | 28.1 | unknown (mock/unreported) | 0.000000
C036-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | 26898e53-95a5-4a18-ab38-a3cae48dbce3 | 27.3 | unknown (mock/unreported) | 0.000000
C036-CH1/Critic/0 | Critic | c2709b55-df34-46b0-929a-6e5e3cc7b58c | 27.5 | unknown (mock/unreported) | 0.000000
C036-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | 6b63080d-8070-44cf-822a-144df0189217 | 27.2 | unknown (mock/unreported) | 0.000000
C036-CH1/Critic/1 | Critic | bcb8bc52-e17b-46e4-9dae-80e827343e21 | 27.3 | unknown (mock/unreported) | 0.000000
C101-CH1/Company Analyst/0 | Company Analyst | 8678da5f-2da7-48cc-bf43-314c64676cf2 | 27.2 | unknown (mock/unreported) | 0.000000
C101-CH1/Research Profiler/0 | Research Profiler | ce127399-bb99-49c7-8bcd-659432eebc12 | 27.2 | unknown (mock/unreported) | 0.000000
C101-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | d81db60e-a1fe-40a8-92d8-ba7214c6a46c | 27.6 | unknown (mock/unreported) | 0.000000
C101-CH1/Critic/0 | Critic | 7513e0b1-eb94-439d-940c-81ace6cbfca6 | 27.5 | unknown (mock/unreported) | 0.000000

Overlapping loops (wall-clock intersection):
- C001-CH1/Company Analyst/0 ↔ C001-CH1/Research Profiler/0: 28 ms (97ecaf1c-1f49-45b0-86e7-b4e875ebf4b1 / a9109861-3913-454e-8760-da7d014cd9a5)
- C025-CH1/Company Analyst/0 ↔ C025-CH1/Research Profiler/0: 28 ms (89c448cc-17ae-4e83-9ecd-c9bb40162fbd / aa945396-ab75-4cb3-91bc-ff5e9992d281)
- C036-CH1/Company Analyst/0 ↔ C036-CH1/Research Profiler/0: 27 ms (6c5e43a8-e1aa-44bc-9f3a-b6281229653e / 87488653-2df2-4a4f-aab4-3643dedfad94)
- C101-CH1/Company Analyst/0 ↔ C101-CH1/Research Profiler/0: 26 ms (8678da5f-2da7-48cc-bf43-314c64676cf2 / ce127399-bb99-49c7-8bcd-659432eebc12)

Critic interventions:
- C001-CH1, revision 0: revise. Unsupported quote R1008.bio
- C001-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C025-CH1, revision 0: revise. Unsupported quote R0637.bio
- C025-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C036-CH1, revision 0: revise. Unsupported quote R0976.bio
- C036-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C101-CH1, revision 0: no_good_match. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.

Send-backs to producing agents:
- C001-CH1: Critic → Matchmaker / Proposal Writer, correction 1: Unsupported quote R1008.bio
- C025-CH1: Critic → Matchmaker / Proposal Writer, correction 1: Unsupported quote R0637.bio
- C036-CH1: Critic → Matchmaker / Proposal Writer, correction 1: Unsupported quote R0976.bio
