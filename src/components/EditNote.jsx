import Box from "@mui/material/Box";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import Modal from "@mui/material/Modal";

const EditNote = (props) => {
  const [docsDescription, setDocsDescription] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  let params;
  if (props.id) {
    params = props;
  }

  const isMounted = useRef();

  const collectionRef = collection(database, "docsData");

  // Quill modules configuration for better formatting support
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "link"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
    ],
    clipboard: {
      matchVisual: false,
    },
  };

  // Quill formats to preserve when pasting
  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "link",
    "list",
    "bullet",
  ];

  function getQuillData(value) {
    setDocsDescription(value);
  }

  useEffect(() => {
    const updateDocsData = setTimeout(() => {
      const document = doc(collectionRef, params.id);
      updateDoc(document, {
        title: documentTitle,
        docsDesc: docsDescription,
      }).catch(() => {
        alert("Cannot Save");
      });
    }, 500);
    return () => clearTimeout(updateDocsData);
  }, [docsDescription, params.id, collectionRef]);

  const getData = () => {
    const document = doc(collectionRef, params.id);
    onSnapshot(document, (docs) => {
      setDocumentTitle(docs.data().title);
      setDocsDescription(docs.data().docsDesc);
    });
  };

  useEffect(() => {
    if (isMounted.current) {
      return;
    }

    isMounted.current = true;
    getData();
  }, []);

  return (
    <Modal
      onClose={() => {
        props.setOpenEditDocModel(false);

        props.setActiveId(null);
      }}
      open={props.openEditDocModel}
      aria-labelledby="keep-mounted-modal-title"
      aria-describedby="keep-mounted-modal-description"
      sx={{
        transformStyle: "revert-layer",
        transition: "2s",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "900px",
          height: "90vh",
          maxHeight: "90vh",
          borderRadius: "12px",
          border: "0",
          bgcolor: "#ffffff",
          padding: "2.5rem",
          textAlign: "start",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          // Responsive padding
          "@media (max-width: 600px)": {
            padding: "1.5rem",
            width: "97%",
            height: "92vh",
            maxHeight: "92vh",
            borderRadius: "8px",
          },
          "@media (max-width: 400px)": {
            padding: "1rem",
            width: "98%",
            height: "95vh",
            maxHeight: "95vh",
          },
        }}
      >
        {/* Title Section */}
        <Box sx={{ marginBottom: "2rem" }}>
          <TextField
            sx={{
              width: "100%",
              "& .MuiInput-root": {
                fontSize: "1.75rem",
                fontWeight: "600",
                color: "#1a1a1a",
              },
              "& .MuiInput-underline:before": {
                borderBottomColor: "#e0e0e0",
              },
              "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                borderBottomColor: "#bdbdbd",
              },
              "& .MuiInput-underline:after": {
                borderBottomColor: "#1976d2",
                borderBottomWidth: "2px",
              },
            }}
            variant="standard"
            placeholder="Note Title"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            fullWidth
            inputProps={{
              style: {
                fontSize: "1.75rem",
                fontWeight: "600",
                padding: "8px 0",
              },
            }}
          />
        </Box>

        {/* Content Section - Flex to fill remaining space */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            "& .quill": {
              display: "flex",
              flexDirection: "column",
              height: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: "8px",
              backgroundColor: "#fafafa",
              transition: "all 0.3s ease",
              "&:focus-within": {
                boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
                borderColor: "#1976d2",
              },
            },
            "& .ql-toolbar": {
              borderBottom: "1px solid #e8e8e8",
              backgroundColor: "#fff",
              borderRadius: "8px 8px 0 0",
              padding: "8px 12px",
              "& .ql-stroke": {
                stroke: "#4a4a4a",
              },
              "& .ql-fill": {
                fill: "#4a4a4a",
              },
              "& button:hover .ql-stroke": {
                stroke: "#1976d2",
              },
              "& button:hover .ql-fill": {
                fill: "#1976d2",
              },
              "& button.ql-active .ql-stroke": {
                stroke: "#1976d2",
              },
              "& button.ql-active .ql-fill": {
                fill: "#1976d2",
              },
            },
            "& .ql-container": {
              flex: 1,
              overflow: "hidden",
              fontSize: "1rem",
              "& .ql-editor": {
                padding: "20px",
                fontSize: "1rem",
                lineHeight: "1.8",
                color: "#333",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                overflow: "auto",
                "&.ql-blank::before": {
                  color: "#aaa",
                  fontStyle: "italic",
                  fontSize: "1rem",
                },
                "& p": {
                  marginBottom: "0.5rem",
                },
                "& h1, & h2, & h3": {
                  marginTop: "1rem",
                  marginBottom: "0.5rem",
                },
                "& ul, & ol": {
                  marginLeft: "1.5rem",
                  marginBottom: "0.5rem",
                },
              },
            },
          }}
        >
          <ReactQuill
            modules={modules}
            formats={formats}
            theme="snow"
            value={docsDescription}
            onChange={getQuillData}
            placeholder="Start typing or paste your content here..."
          />
        </Box>
      </Box>
    </Modal>
  );
};

export default EditNote;
