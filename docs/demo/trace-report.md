Task | Agent | Loop | Duration ms | Tokens | Estimated USD (all attempts)
--- | --- | --- | ---: | ---: | ---:
C001-CH1/Company Analyst/0 | Company Analyst | b513869d-8e78-4ef8-86e3-bf585cb34bf8 | 29.1 | unknown (mock/unreported) | 0.000000
C001-CH1/Research Profiler/0 | Research Profiler | 15c0f9d2-53bb-4552-8487-3e226b39f3d8 | 32.9 | unknown (mock/unreported) | 0.000000
C001-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | b8c2dddc-511b-498e-86ae-07c5c6f12d69 | 26.4 | unknown (mock/unreported) | 0.000000
C001-CH1/Critic/0 | Critic | 630afd8f-8f7e-4476-a153-0c40d9a2091c | 26.0 | unknown (mock/unreported) | 0.000000
C001-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | 959d8ce4-e512-414f-821a-c8723c75d568 | 27.1 | unknown (mock/unreported) | 0.000000
C001-CH1/Critic/1 | Critic | c769ff2a-f5a7-42a1-bdcb-467bbf8fa050 | 25.8 | unknown (mock/unreported) | 0.000000
C025-CH1/Company Analyst/0 | Company Analyst | 543dcee5-6c20-4109-9bfa-960bd443ef30 | 26.9 | unknown (mock/unreported) | 0.000000
C025-CH1/Research Profiler/0 | Research Profiler | 655b4e25-d005-4e82-81b8-817cdbf18745 | 27.6 | unknown (mock/unreported) | 0.000000
C025-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | 8597ae46-1dcf-410b-9bb5-479825068d6e | 26.9 | unknown (mock/unreported) | 0.000000
C025-CH1/Critic/0 | Critic | 11ab2947-0bd6-4e35-8f53-c74ad6952197 | 27.4 | unknown (mock/unreported) | 0.000000
C025-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | 3d5d284e-1dbb-46e7-8f90-a8cafaa15cfc | 26.8 | unknown (mock/unreported) | 0.000000
C025-CH1/Critic/1 | Critic | 8c41f2d9-9a8d-40db-b775-90b2192eac2c | 25.5 | unknown (mock/unreported) | 0.000000
C036-CH1/Company Analyst/0 | Company Analyst | 0a4cc0bd-04ea-47bc-b65b-a0546a4edc51 | 26.8 | unknown (mock/unreported) | 0.000000
C036-CH1/Research Profiler/0 | Research Profiler | 0579dcda-168c-4de0-9b8b-58297718a6bf | 27.5 | unknown (mock/unreported) | 0.000000
C036-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | 34c4b864-347a-4ab6-80d3-8e426d46536e | 25.8 | unknown (mock/unreported) | 0.000000
C036-CH1/Critic/0 | Critic | 1a3897c8-89bf-46b8-89b4-4424ba8e6350 | 26.1 | unknown (mock/unreported) | 0.000000
C036-CH1/Matchmaker / Proposal Writer/1 | Matchmaker / Proposal Writer | fbbeb154-1035-41ad-9e2d-2fa1c943a1e3 | 26.5 | unknown (mock/unreported) | 0.000000
C036-CH1/Critic/1 | Critic | 67ed268b-2bf2-4acb-8127-bbfe49a02429 | 26.3 | unknown (mock/unreported) | 0.000000
C101-CH1/Company Analyst/0 | Company Analyst | 136b0deb-7713-4378-8893-b0029c5d0330 | 26.5 | unknown (mock/unreported) | 0.000000
C101-CH1/Research Profiler/0 | Research Profiler | dbc77dd5-fbb4-4762-87d0-cea48843c88b | 26.9 | unknown (mock/unreported) | 0.000000
C101-CH1/Matchmaker / Proposal Writer/0 | Matchmaker / Proposal Writer | e7fca93b-5606-4877-8ca6-a73115f931ad | 26.3 | unknown (mock/unreported) | 0.000000
C101-CH1/Critic/0 | Critic | c9993113-6a61-4df3-9ccd-a90795127602 | 26.2 | unknown (mock/unreported) | 0.000000

Overlapping loops (wall-clock intersection):
- C001-CH1/Company Analyst/0 ↔ C001-CH1/Research Profiler/0: 28 ms (b513869d-8e78-4ef8-86e3-bf585cb34bf8 / 15c0f9d2-53bb-4552-8487-3e226b39f3d8)
- C025-CH1/Company Analyst/0 ↔ C025-CH1/Research Profiler/0: 26 ms (543dcee5-6c20-4109-9bfa-960bd443ef30 / 655b4e25-d005-4e82-81b8-817cdbf18745)
- C036-CH1/Company Analyst/0 ↔ C036-CH1/Research Profiler/0: 27 ms (0a4cc0bd-04ea-47bc-b65b-a0546a4edc51 / 0579dcda-168c-4de0-9b8b-58297718a6bf)
- C101-CH1/Company Analyst/0 ↔ C101-CH1/Research Profiler/0: 26 ms (136b0deb-7713-4378-8893-b0029c5d0330 / dbc77dd5-fbb4-4762-87d0-cea48843c88b)

Critic interventions:
- C001-CH1, revision 0: revise. Unsupported quote R1008.bio
- C001-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C025-CH1, revision 0: revise. Unsupported quote R0637.bio
- C025-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C036-CH1, revision 0: revise. Unsupported quote R0976.bio
- C036-CH1, revision 1: accept. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
- C101-CH1, revision 0: no_good_match. MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.
