import { useState } from "react";
import ModalComponent from "./ModalComponent";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import EditNote from "./EditNote";

const NotesHome = () => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openEditDocModel, setOpenEditDocModel] = useState(false);
  const [docId, setDocId] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const [docsData, setDocsData] = useState([]);
  const isMounted = useRef();

  const collectionRef = collection(database, "docsData");

  let navigate = useNavigate();

  const addData = () => {
    if (title === "") {
      return;
    }
    handleClose();
    addDoc(collectionRef, {
      title: title,
      docsDesc: "",
    })
      .then(() => {
        //alert("Cannot add data");
        console.log("Added title: " + title);
      })
      .catch(() => {
        alert("Cannot add data");
      });
    setTitle("");
  };

  const getData = () => {
    onSnapshot(collectionRef, (data) => {
      setDocsData(
        data.docs.map((doc) => {
          return { ...doc.data(), id: doc.id };
        }),
      );
      setLoading(false);
    });
  };

  // function getId(id) {
  //   navigate(`/EditNote/${id}`);
  // }

  useEffect(() => {
    if (isMounted.current) {
      return;
    }
    isMounted.current = true;
    getData();
  }, []);

  function deleteItem(id) {
    const document = doc(collectionRef, id);
    deleteDoc(document, {
      title: "",
      docsDesc: "",
    });
  }
  const handleOnClick = (id) => {
    setDocId(id);
    setOpenEditDocModel(!openEditDocModel);
  };
  return (
    <Box
      sx={{ background: "#f8f9fa", minHeight: "100vh", paddingBottom: "3rem" }}
    >
      <Container
        className="docsContainer"
        sx={{
          textAlign: "center",
        }}
        fixed
      >
        <Typography
          variant="h3"
          sx={{
            paddingTop: "2.5rem",
            marginBottom: "2rem",
            fontWeight: "800",
            color: "#1a1a1a",
            letterSpacing: "-0.5px",
          }}
        >
          Keep Notes
        </Typography>
        <Button
          variant="contained"
          sx={{
            paddingX: "2.5rem",
            paddingY: "0.9rem",
            fontSize: "1rem",
            fontWeight: "600",
            textTransform: "none",
            backgroundColor: "#4b5563",
            color: "#fff",
            borderRadius: "8px",
            transition: "background-color 0.2s ease, box-shadow 0.2s ease",
            marginBottom: "1.5rem",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "#374151",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            },
          }}
          onClick={handleOpen}
          startIcon={<AddIcon />}
        >
          Take a note
        </Button>
        <ModalComponent
          open={open}
          title={title}
          setTitle={setTitle}
          addData={addData}
          handleClose={handleClose}
        />
        {openEditDocModel && (
          <EditNote
            setActiveId={setActiveId}
            setOpenEditDocModel={setOpenEditDocModel}
            openEditDocModel={openEditDocModel}
            id={docId}
          />
        )}

        <Typography
          sx={{
            color: "#6b7280",
            fontSize: "0.95rem",
            marginBottom: "1.5rem",
            fontWeight: "500",
          }}
        >
          {docsData.length} {docsData.length === 1 ? "note" : "notes"}
        </Typography>

        {/* Loading Skeleton Cards */}
        {loading && (
          <Grid
            container
            spacing={2.5}
            columns={{ xs: 4, sm: 8, md: 12 }}
            sx={{
              marginTop: "0.5rem",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <Grid item key={index} xs={4}>
                <Stack
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    padding: "1.5rem",
                    height: "280px",
                    position: "relative",
                  }}
                >
                  <Skeleton
                    variant="text"
                    height={30}
                    sx={{ marginBottom: "1rem" }}
                  />
                  <Skeleton
                    variant="text"
                    height={20}
                    sx={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton
                    variant="text"
                    height={20}
                    sx={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton
                    variant="text"
                    height={20}
                    sx={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton variant="text" height={20} />
                </Stack>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Notes Grid */}
        {!loading && (
          <Grid
            container
            spacing={2.5}
            columns={{ xs: 4, sm: 8, md: 12 }}
            sx={{
              marginTop: "0.5rem",
            }}
          >
            {docsData.length === 0 ? (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "300px",
                  marginTop: "3rem",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    color: "#999",
                    marginBottom: "1rem",
                  }}
                >
                  📋 No notes yet
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    color: "#bbb",
                  }}
                >
                  Create your first note by clicking "Take a note"
                </Typography>
              </Box>
            ) : (
              docsData.map((docData, index) => {
                return (
                  <Grid
                    item
                    key={index}
                    xs={4}
                    className={`edit__model ${
                      activeId == docData.id ? "active" : ""
                    }`}
                  >
                    <Stack
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "12px",
                        backgroundColor: "#ffffff",
                        padding: "1.5rem",
                        height: "280px",
                        overflowY: "auto",
                        position: "relative",
                        transition:
                          "box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                        cursor: "pointer",
                        ":hover": {
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                          borderColor: "#c7c7c7",
                          backgroundColor: "#fcfcfc",
                        },
                      }}
                    >
                      <Stack justifyContent={"flex-start"}>
                        <Typography
                          sx={{
                            fontWeight: "700",
                            textTransform: "capitalize",
                            color: "#1a1a1a",
                            textAlign: "start",
                            width: "85%",
                            wordBreak: "break-word",
                            lineHeight: "1.4rem",
                            fontSize: "1.1rem",
                            marginBottom: "1rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {docData.title || "Untitled"}
                        </Typography>
                        <Stack
                          position={"absolute"}
                          direction={"row"}
                          spacing={0}
                          sx={{
                            color: "#666",
                            right: ".75rem",
                            top: ".75rem",
                          }}
                        >
                          <IconButton
                            aria-label="edit"
                            onClick={() => {
                              handleOnClick(docData.id);
                              setActiveId(docData.id);
                            }}
                            sx={{
                              padding: "6px",
                              "&:hover": {
                                color: "#1976d2",
                                backgroundColor: "rgba(25, 118, 210, 0.08)",
                              },
                            }}
                          >
                            <BorderColorOutlinedIcon
                              sx={{
                                cursor: "pointer",
                              }}
                              fontSize="small"
                            />
                          </IconButton>
                          <IconButton
                            aria-label="delete"
                            onClick={() => deleteItem(docData.id)}
                            sx={{
                              padding: "6px",
                              "&:hover": {
                                color: "#d32f2f",
                                backgroundColor: "rgba(211, 47, 47, 0.08)",
                              },
                            }}
                          >
                            <DeleteOutlineOutlinedIcon
                              sx={{
                                cursor: "pointer",
                              }}
                              fontSize="small"
                            />
                          </IconButton>
                        </Stack>
                      </Stack>
                      <Typography
                        onClick={() => {
                          handleOnClick(docData.id);
                          setActiveId(docData.id);
                        }}
                        sx={{
                          borderRadius: "6px",
                          marginTop: "0.5rem",
                          color: "#666",
                          lineHeight: "1.5rem",
                          textAlignLast: "start",
                          height: "180px",
                          overflow: "hidden",
                          fontSize: "0.95rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 6,
                          WebkitBoxOrient: "vertical",
                          textOverflow: "ellipsis",
                          "& p": {
                            margin: "0 0 0.5rem 0",
                          },
                          "& h1, & h2, & h3": {
                            fontSize: "1rem",
                            fontWeight: "600",
                            margin: "0.5rem 0",
                          },
                        }}
                        dangerouslySetInnerHTML={{ __html: docData.docsDesc }}
                      />
                    </Stack>
                  </Grid>
                );
              })
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default NotesHome;
