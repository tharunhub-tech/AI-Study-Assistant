import { SampleDoc } from './types';

/**
 * Bundled sample lecture notes so the RAG pipeline can be demonstrated
 * instantly, before any PDF upload (also useful when a scanned PDF yields
 * no text layer).
 */
export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'sample_dbms',
    title: 'DBMS Unit III \u2014 Normalization & Functional Dependencies',
    subject: 'BCA-305 (LPU)',
    pages: [
      `Unit 3: Relational Database Design and Normalization.

Normalization is the process of organizing the attributes and relations of a database to reduce data redundancy and improve data integrity. Redundancy causes update anomalies: an insertion anomaly occurs when new data cannot be recorded without unrelated data, a deletion anomaly occurs when deleting a row removes unrelated information, and a modification anomaly occurs when one copy of repeated data is changed but another is not.

A functional dependency X -> Y (read as X functionally determines Y) holds in a relation R if every tuples with the same value of X also have the same value of Y. X is the determinant and Y is the dependent attribute. A functional dependency is a special case of a multivalued dependency.

Armstrong's axioms are the inference rules used to find all dependencies of a relation. They are: reflexivity, which states that X -> X for any X; augmentation, which states that if X -> Y then XZ -> YZ; and transitivity, which states that if X -> Y and Y -> Z then X -> Z. From these, the additional rules of union (if X -> Y and X -> Z then X -> YZ) and decomposition (if X -> YZ then X -> Y and X -> Z) can be derived.

The closure of a set of functional dependencies, denoted F+, is the set of all dependencies that can be logically implied from F. Attribute closure of X, written X+, is the set of all attributes that can be determined from X using F. A superkey of a relation is a set of attributes that uniquely identifies each tuple, and a candidate key is a minimal superkey, that is, no proper subset of it is a superkey.

A decomposition of a relation R into R1 and R2 is lossless join decomposition if natural joining R1 and R2 reproduces the original relation R. The lossless join test uses the common attributes of the two parts: the decomposition is lossless if the intersection of R1 and R2 is a superkey for at least one of the parts, or if the intersection determines an attribute of one part. Dependency preserving decomposition ensures that every functional dependency of the original schema can be checked using the decomposed schemas without a join.

A prime attribute is any attribute that belongs to some candidate key, and a non-prime attribute belongs to no candidate key. These definitions are required before stating the normal forms, which are studied next.`,
      `Normal Forms.

A relation is in First Normal Form (1NF) if every attribute contains only atomic, indivisible values, and there are no repeating groups or arrays. Converting to 1NF means flattening the structure so that each cell holds a single value.

A relation is in Second Normal Form (2NF) if it is in 1NF and no non-prime attribute is partially dependent on any candidate key. Partial dependency means that an attribute depends on only part of a composite key. A relation that is already in 1NF with a single attribute key is automatically in 2NF.

A relation is in Third Normal Form (3NF) if it is in 2NF and no non-prime attribute is transitively dependent on any candidate key. Formally, for every non-trivial functional dependency X -> Y, either X is a superkey of the relation or Y is a prime attribute. The textbook example relation StudentCourse(INRollNo, INName, ISCode, ISFee, FACId, FACName) has candidate key INRollNo. Because ISFee is determined by ISCode, which is not a key, and ISCode determines ISFee, a transitive dependency exists through INRollNo -> ISCode -> ISFee. The 3NF decomposition splits the relation into StudentCourse(INRollNo, INName, ISCode) and Course(ISCode, ISFee, FACId, FACName), removing the anomaly while preserving the dependencies.

A relation is in Boyce-Codd Normal Form (BCNF) if, for every non-trivial functional dependency X -> Y, X is a superkey. BCNF is stricter than 3NF: every BCNF relation is in 3NF, but a 3NF relation may not be in BCNF. The classic violation case is a relation with two overlapping candidate keys, such asSTRUCTOR(Course, Instructor, Semester) where every pair of attributes determines the third; here no single determinant is a superkey because the functional dependencies are Course, Instructor -> Semester and Course, Semester -> Instructor.

Decomposition into BCNF proceeds by repeatedly splitting a relation that violates BCNF until every part satisfies the rule. BCNF decomposition is always lossless, but it may not be dependency preserving.

Denormalization is the deliberate introduction of redundancy into a normalized schema, usually to reduce the number of joins and improve read performance in reporting systems. It trades storage and update cost for query speed.

The advantages of normalization are reduced redundancy, elimination of update anomalies, and a clearer logical structure. The main disadvantage is that queries may require more joins, which can slow down retrieval, so database designers balance normalization against performance requirements.`,
      `Revision questions for Unit 3.

Question 1. Define functional dependency and state Armstrong's axioms. Answer: a functional dependency X -> Y holds when equal values of X always imply equal values of Y; Armstrong's axioms are reflexivity, augmentation and transitivity, from which union and decomposition follow.

Question 2. Differentiate between 3NF and BCNF. Answer: in 3NF a non-trivial dependency X -> Y requires X to be a superkey or Y to be prime, whereas BCNF requires X to be a superkey in every case, so BCNF is stricter.

Question 3. What is a lossless join decomposition? Answer: a decomposition is lossless if joining the parts gives back exactly the original tuples, which is tested using the common attributes and superkey conditions.

Question 4. Explain insertion, deletion and modification anomalies with an example. Answer: storing the instructor of a course in every student row means removing the last student of a course deletes the instructor record, which is a deletion anomaly; changing an instructor in one row but not another is a modification anomaly; and a new course with no students yet cannot be stored, which is an insertion anomaly.

Key definitions to memorize: candidate key, superkey, prime attribute, closure of a dependency set, lossless join, dependency preservation, denormalization.`,
    ],
  },
  {
    id: 'sample_os',
    title: 'Operating Systems Unit II \u2014 CPU Scheduling & Processes',
    subject: 'BCA-205 (LPU)',
    pages: [
      `Unit 2: Process Management and CPU Scheduling.

A process is a program in execution, together with the current state of that program. The Process Control Block (PCB) is the data structure the operating system maintains for each process; it stores the process state, program counter, CPU registers, scheduling information such as priority and pointer to the next PCB, memory management information, and accounting information such as CPU time used.

The states of a process are new, ready, running, waiting (blocked) and terminated. A process moves from ready to running when the scheduler dispatches it, from running to waiting when it requests an I/O operation or waits for an event, and from waiting back to ready when the event completes.

CPU scheduling is the activity of the scheduler that decides which process in the ready queue will be allocated the CPU next. Scheduling is necessary because in a multiprogrammed system there are usually more processes than processors, and the CPU is a scarce resource that must be shared among all processes.

The criteria used to compare CPU scheduling algorithms are CPU utilization, which is the fraction of time the CPU is busy and should be kept close to 100 percent; throughput, which is the number of processes completed per unit time; turnaround time, which is the interval from submission to completion of a process; waiting time, which is the total time a process spends in the ready queue; and response time, which is the time between submission of a request and the first response, an important measure for interactive systems.

Scheduling can be preemptive or non-preemptive. In non-preemptive scheduling the CPU is released only when the process finishes or blocks voluntarily, while in preemptive scheduling the OS can take the CPU away from a running process, for example when a higher priority process arrives or a time quantum expires. Preemptive scheduling involves the cost of context switching and possible race conditions on shared data.

A context switch is the mechanism of saving the state of a running process into its PCB and loading the state of another process from its PCB. It is pure overhead because no useful work is done during the switch, and the cost depends on the memory architecture and the amount of state to save.`,
      `Scheduling Algorithms.

First Come First Served (FCFS) schedules processes in the order of their arrival in the ready queue and is implemented with a simple FIFO queue. It is easy to understand but leads to the convoy effect, where short processes behind one long process wait a long time, lowering both CPU and device utilization. The average waiting time for the sequence of burst times 24, 3, 3 is 28 under FCFS when the first process arrives first.

Shortest Job First (SJF) scheduling associates with each process its next CPU burst length and picks the process with the smallest burst. It is provably optimal for average waiting time, but the length of the next CPU burst must be estimated, typically by exponential averaging of previous bursts. The next burst estimate is computed as tau n+1 = alpha tn + (1 - alpha) tau n, where tn is the actual burst of the most recent instance.

Shortest Remaining Time First (SRTF) is the preemptive version of SJF: if a new process arrives with a burst shorter than the remaining time of the current process, the current process is preempted. Priority scheduling selects the process with the highest priority, where priority may be defined by memory needs, time requirements or I/O needs. A problem with priority scheduling is indefinite blocking, or starvation, of low priority processes; ageing is the technique of gradually increasing the priority of a waiting process to solve starvation.

Round Robin (RR) scheduling is designed for time sharing systems. A time quantum q is defined and the ready queue is treated as a circular queue; the scheduler gives the CPU to the first process for q milliseconds and then preempts it, moving it to the rear of the queue. If the process does not finish within q, the context switch occurs after q milliseconds. The performance of RR depends heavily on the choice of quantum: a very large quantum behaves like FCFS, while a very small quantum increases context switch overhead and reduces CPU utilization. A general guideline is that the quantum should be large with respect to the context switch time, commonly 80 percent of the switching cost.

Multilevel queue scheduling partitions the ready queue into separate queues, for example foreground (interactive) and background (batch) queues, and each queue may use its own algorithm, commonly RR in the foreground and FCFS in the background. Scheduling among queues is either fixed priority or time slice, such as 80 percent to the foreground and 20 percent to the background. Multilevel feedback queue scheduling allows processes to move between queues to prevent starvation of short processes.`,
      `Revision questions for Unit 2.

Question 1. What are the five states of a process? Answer: new, ready, running, waiting and terminated.

Question 2. Define turnaround time and response time. Answer: turnaround time is the total interval from submission to completion, while response time is the interval between submission and the first output, which matters for interactive systems.

Question 3. Explain the convoy effect. Answer: in FCFS, short processes arriving behind a long process wait a long time, and the CPU and I/O devices become underutilized while the long process runs, which is called the convoy effect.

Question 4. How does ageing prevent starvation in priority scheduling? Answer: ageing gradually increases the priority of processes that wait too long, eventually making them eligible for dispatch.

Question 5. What is the effect of a very small time quantum in round robin scheduling? Answer: the context switch overhead increases and CPU utilization falls because a large fraction of time is spent switching rather than executing processes.

Key definitions to memorize: PCB, context switch, burst time, SJF optimality, ageing, round robin quantum, multilevel feedback queue.`,
    ],
  },
  {
    id: 'sample_cn',
    title: 'Computer Networks Unit IV \u2014 OSI Model & TCP/IP',
    subject: 'BCA-207 (LPU)',
    pages: [
      `Unit 4: Network Models and the OSI Reference Model.

A computer network is a collection of interconnected nodes that communicate by sharing data and resources using a common set of protocols. The OSI (Open Systems Interconnection) reference model, developed by the International Organization for Standardization, divides network communication into seven separate layers so that each layer provides a well defined service to the layer above it and uses the service of the layer below it. This separation allows vendors to implement layers independently and promotes interoperability.

Layer 1 is the Physical layer. It transmits raw bits over a physical medium, and deals with electrical signalling, voltage levels, data rates, connector pin layouts and the mechanical transmission of the bit stream.

Layer 2 is the Data Link layer. It provides node to node data transfer between two directly connected nodes, handles framing of packets into frames, physical addressing using MAC addresses, error detection with CRC, and flow control. The IEEE 802.3 (Ethernet) and 802.11 (Wi-Fi) standards operate at this layer, and the layer is divided into the logical link control and media access control sublayers.

Layer 3 is the Network layer. It provides logical addressing using IP addresses, routing of packets across multiple networks, and determination of the best path for data. Routers operate at this layer, and protocols include IP, ICMP and IPv6. The service may be connectionless datagram delivery or virtual circuit service.

Layer 4 is the Transport layer. It provides end to end communication between processes on different hosts, segmentation and reassembly of data, flow control, and error recovery. The two well known protocols are TCP, which is connection oriented and reliable, and UDP, which is connectionless and lightweight. Transport layer addressing uses port numbers.`,
      `Upper layers of the OSI model.

Layer 5 is the Session layer. It establishes, manages and terminates sessions between applications, and provides dialogue control so that communication can be half duplex, full duplex or simplex. Examples include session checkpoints that allow resumption after a failure.

Layer 6 is the Presentation layer. It is responsible for syntax and semantics of the data exchanged, performing translation between character encodings, data compression and decompression, and encryption and decryption.

Layer 7 is the Application layer. It is the layer closest to the end user and provides network services directly to user applications such as web browsing with HTTP, file transfer with FTP, and electronic mail with SMTP.

Encapsulation is the process of adding a header by each layer as data travels down the stack. Data given by the application layer becomes a segment at the transport layer, a packet or datagram at the network layer, and a frame at the data link layer, each with its own header (and trailer at the data link layer). Decapsulation reverses this process as the frame moves up the receiving stack.

Protocol data unit is the unit of information exchanged between peer layers: bits at the physical layer, frames at the data link layer, packets at the network layer, segments at the transport layer, and messages at the session, presentation and application layers. A repeater regenerates signals at layer 1, a switch forwards frames using MAC addresses at layer 2, and a router forwards packets using IP addresses at layer 3.

TCP/IP model and comparison.

The TCP/IP reference model has four layers: the network access layer (equivalent to the physical and data link layers of OSI), the internet layer (equivalent to the network layer), the transport layer, and the application layer (equivalent to the session, presentation and application layers combined). TCP/IP is the practical protocol suite of the internet, and its suite includes IP, TCP, UDP, ICMP, ARP, HTTP, FTP, SMTP and DNS.

TCP is connection oriented and reliable, using a three way handshake with the SYN, SYN-ACK and ACK segments to establish a connection before data transfer, and using sequence numbers, acknowledgements, flow control with a sliding window and congestion control. UDP is connectionless and unreliable; it has no handshake, no guarantee of delivery and no ordering, but it has lower overhead and is used for DNS queries, streaming, voice and video where speed matters.`,
      `Revision questions for Unit 4.

Question 1. State the seven layers of the OSI model with one function each. Answer: physical transmits bits; data link provides framing and MAC addressing; network provides IP addressing and routing; transport provides end to end delivery and ports; session manages dialogues; presentation handles translation, compression and encryption; application provides network services to user programs.

Question 2. Compare TCP and UDP. Answer: TCP is connection oriented and reliable with handshake, sequencing and retransmission, while UDP is connectionless with minimal overhead and no delivery guarantee, making it suitable for real time traffic.

Question 3. What is the three way handshake? Answer: TCP connection establishment in which the client sends SYN, the server replies SYN-ACK, and the client confirms with ACK.

Question 4. Differentiate between a switch and a router. Answer: a switch operates at the data link layer and forwards frames using MAC addresses within a LAN, while a router operates at the network layer and forwards packets between networks using IP addresses.

Question 5. Explain encapsulation in TCP/IP. Answer: each lower layer adds its own header to the data received from the layer above, producing segment, packet and finally frame before transmission, and the receiver strips these headers in reverse order.

Key definitions to memorize: PDU, encapsulation, sliding window, handshake, protocol suite, gateway versus router.`,
    ],
  },
];

export function findSample(id: string): SampleDoc | undefined {
  return SAMPLE_DOCS.find((s) => s.id === id);
}
