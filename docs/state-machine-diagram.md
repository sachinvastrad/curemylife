# HomeoOpinion — Patient Case State Machine

This document defines the lifecycle states and transitions of a Patient Case in the HomeoOpinion platform.

## Case States

1. **`DRAFT`**: The patient has started filling out the intake form but has not yet submitted it.
2. **`SUBMITTED`**: The patient has completed the form and uploaded necessary documents. The case is now in the system queue.
3. **`AI_PROCESSING`**: The system is currently generating a preliminary AI report based on the submitted symptoms and history.
4. **`PENDING_REVIEW`**: The AI report is ready. The case is waiting for a Doctor to pick it up from the queue.
5. **`UNDER_REVIEW`**: A Doctor has assigned the case to themselves and is currently analyzing the information and the AI report.
6. **`INFO_REQUESTED`**: The Doctor requires more information or clearer documents from the patient before providing a prescription.
7. **`COMPLETED`**: The Doctor has finalized their review and issued an E-Prescription or final opinion.
8. **`CLOSED`**: The case lifecycle is fully terminated (e.g., follow-up period has expired or the patient has archived it).

## State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Patient creates case
    
    DRAFT --> SUBMITTED : Patient submits intake form
    
    SUBMITTED --> AI_PROCESSING : System triggers AI
    AI_PROCESSING --> PENDING_REVIEW : AI report generated
    
    PENDING_REVIEW --> UNDER_REVIEW : Doctor accepts case
    
    UNDER_REVIEW --> INFO_REQUESTED : Doctor requests more details
    INFO_REQUESTED --> UNDER_REVIEW : Patient updates case
    
    UNDER_REVIEW --> COMPLETED : Doctor issues prescription/opinion
    
    COMPLETED --> CLOSED : Time elapsed / Patient archives
    
    %% Alternative flows
    DRAFT --> CLOSED : Patient deletes draft
    SUBMITTED --> CLOSED : Admin cancels case
```

## Key Transitions & Notifications

- **`SUBMITTED` → `PENDING_REVIEW`**: Once the AI report is attached, Doctors receive a notification of a new available case.
- **`UNDER_REVIEW` → `INFO_REQUESTED`**: The Patient receives an email/notification that the Doctor needs more details.
- **`UNDER_REVIEW` → `COMPLETED`**: The Patient receives their final Homeopathic opinion and e-prescription via email/notification.
